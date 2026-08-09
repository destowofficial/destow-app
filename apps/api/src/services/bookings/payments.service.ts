import { and, eq, ne } from 'drizzle-orm';
import type { PaymentMethod } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { bookings } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { payments, type PaymentSignature } from '../../lib/adapters/payments.js';
import { recordPaymentEvent } from '../../lib/metrics/metrics.js';
import { safeError } from '../../lib/log/safe.js';

// Paying for a booking. Two rules run through all of it:
//
//   1. The amount is the fare frozen on the booking. It is never taken from the
//      request, so there is no field a client can send that changes what it owes.
//   2. Marking a booking paid is idempotent and atomic. A customer who taps Pay
//      twice, plus a webhook arriving for the same payment, must settle to one
//      payment - not three, and not a 500.

async function ownBooking(customerUserId: string, bookingId: string) {
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerUserId, customerUserId)))
    .limit(1);
  if (!row) throw AppError.notFound('Booking not found');
  return row;
}

export interface PaymentIntent {
  orderId: string;
  amountPaise: number;
  keyId: string;
  provider: string;
  alreadyPaid: boolean;
}

export async function startPayment(
  customerUserId: string,
  bookingId: string,
): Promise<PaymentIntent> {
  const booking = await ownBooking(customerUserId, bookingId);

  // Already settled: say so plainly instead of opening a second order the
  // customer could pay against.
  if (booking.paymentStatus === 'paid') {
    return {
      orderId: booking.paymentOrderId ?? '',
      amountPaise: booking.totalFarePaise,
      keyId: '',
      provider: payments.name,
      alreadyPaid: true,
    };
  }
  if (booking.status === 'cancelled') {
    throw AppError.conflict('That booking was cancelled');
  }

  // Postpaid: what this trip costs is not known until the vehicle is back and
  // the customer has agreed the odometer. Opening an order before that would
  // take the estimate, and the booking would read 'paid' while a longer trip
  // went partly unbilled - the operator absorbing the difference silently.
  if (!booking.distanceConfirmedAt) {
    throw AppError.conflict('This trip cannot be paid for until the distance is confirmed');
  }

  // Reuse the existing order rather than minting a new one per tap - otherwise a
  // customer who backs out of the checkout and retries accumulates open orders,
  // and a webhook for the abandoned one still resolves to this booking.
  if (booking.paymentOrderId) {
    return {
      orderId: booking.paymentOrderId,
      amountPaise: booking.totalFarePaise,
      keyId: '',
      provider: payments.name,
      alreadyPaid: false,
    };
  }

  // The amount comes from the frozen snapshot, never from the caller.
  const order = await payments.createOrder({
    bookingId: booking.id,
    amountPaise: booking.totalFarePaise,
  });

  await db
    .update(bookings)
    .set({ paymentOrderId: order.orderId })
    .where(eq(bookings.id, booking.id));

  return { ...order, provider: payments.name, alreadyPaid: false };
}

// The atomic settle. The WHERE clause excludes already-paid rows, so a second
// caller updates nothing and we report success without charging twice.
//
// It also excludes cancelled rows (#34). Guarding only on payment status left a
// reachable gap with no race in it: the customer starts a payment, cancels while
// it is in flight - at which point nothing is refunded, because nothing was paid
// yet - and the gateway then captures and fires its webhook. The settle
// succeeded, leaving a booking both cancelled and paid, money taken, and nothing
// flagged. Refusing here is what makes that visible instead of silent.
async function markPaid(
  bookingId: string,
  paymentId: string,
  method?: PaymentMethod,
): Promise<'settled' | 'already_paid' | 'cancelled'> {
  const updated = await db
    .update(bookings)
    .set({
      paymentStatus: 'paid',
      transactionRef: paymentId,
      paidAt: new Date(),
      ...(method ? { paymentMethod: method } : {}),
    })
    .where(
      and(
        eq(bookings.id, bookingId),
        ne(bookings.paymentStatus, 'paid'),
        ne(bookings.status, 'cancelled'),
      ),
    )
    .returning({ id: bookings.id });

  if (updated.length > 0) return 'settled';

  // Nothing was updated, and the two reasons are not interchangeable: one is a
  // duplicate to acknowledge, the other is captured money owed back.
  const [row] = await db
    .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return row?.status === 'cancelled' && row.paymentStatus !== 'paid' ? 'cancelled' : 'already_paid';
}

export async function confirmPayment(
  customerUserId: string,
  bookingId: string,
  sig: PaymentSignature,
  method?: PaymentMethod,
) {
  const booking = await ownBooking(customerUserId, bookingId);

  // The signature is over the order id the gateway issued. Accepting a signature
  // for a different order would let a real ₹1 payment settle a ₹9000 booking.
  if (!booking.paymentOrderId || booking.paymentOrderId !== sig.orderId) {
    recordPaymentEvent(payments.name, method ?? 'upi', 'order_mismatch');
    throw AppError.badRequest('That payment does not belong to this booking');
  }

  if (!payments.verifyPayment(sig)) {
    recordPaymentEvent(payments.name, method ?? 'upi', 'bad_signature');
    // Deliberately vague: a client that can distinguish "wrong signature" from
    // "wrong order" learns how to probe for a working combination.
    throw AppError.badRequest('Payment could not be verified');
  }

  const outcome = await markPaid(booking.id, sig.paymentId, method);

  // The trip was called off while this payment was in flight. The signature is
  // real and the money is captured, so this is not a client error to hide - it
  // is a refund we owe. Recorded loudly rather than swallowed as success.
  if (outcome === 'cancelled') {
    recordPaymentEvent(payments.name, method ?? 'upi', 'paid_after_cancel');
    console.error(
      `[payments] captured payment ${sig.paymentId} for cancelled booking ${booking.id} - refund owed`,
    );
    throw AppError.conflict('That booking was cancelled. The payment will be refunded.');
  }

  recordPaymentEvent(payments.name, method ?? 'upi', outcome === 'settled' ? 'paid' : 'duplicate');

  return { bookingId: booking.id, paymentStatus: 'paid' as const, alreadyPaid: outcome === 'already_paid' };
}

// The safety net for the case the client never comes back - the app was killed
// mid-checkout, or the network dropped after the customer's money moved. The
// gateway is the source of truth, so this settles the booking with no customer
// session involved.
export async function handlePaymentWebhook(rawBody: string, signature: string) {
  if (!payments.verifyWebhook(rawBody, signature)) {
    recordPaymentEvent(payments.name, 'upi', 'bad_webhook_signature');
    // 400, not 401: an unsigned webhook is a malformed request, and returning
    // 401 invites the gateway to retry forever.
    throw AppError.badRequest('Invalid webhook signature');
  }

  let event: { orderId?: string; paymentId?: string; status?: string; amountPaise?: number };
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    // Razorpay nests the entity; the stub sends it flat. Accept both so the
    // shape can be pinned when real events are available to look at.
    const entity =
      ((parsed.payload as Record<string, Record<string, Record<string, unknown>>> | undefined)
        ?.payment?.entity as Record<string, unknown> | undefined) ?? parsed;
    event = {
      orderId: entity.order_id as string | undefined,
      paymentId: entity.id as string | undefined,
      status: entity.status as string | undefined,
      // Razorpay reports amounts in paise, the same unit we store.
      amountPaise: typeof entity.amount === 'number' ? entity.amount : undefined,
    };
  } catch (err) {
    console.error(`[payments] unparseable webhook body: ${safeError(err)}`);
    throw AppError.badRequest('Malformed webhook body');
  }

  if (!event.orderId || !event.paymentId) {
    throw AppError.badRequest('Webhook is missing the order or payment id');
  }
  // Only a captured payment settles a booking. An 'authorized' event means the
  // money is held, not taken.
  if (event.status && event.status !== 'captured') {
    return { handled: false, reason: `ignored status ${event.status}` };
  }

  const [booking] = await db
    .select({ id: bookings.id, totalFarePaise: bookings.totalFarePaise })
    .from(bookings)
    .where(eq(bookings.paymentOrderId, event.orderId))
    .limit(1);

  // Acknowledge unknown orders rather than erroring: a 4xx makes the gateway
  // retry an event we will never recognise.
  if (!booking) return { handled: false, reason: 'no booking for that order' };

  // Reconcile against the frozen fare. A signature proves the gateway sent the
  // event, not that the right amount arrived - so without this a part payment
  // would settle the booking in full and the trip would run for less than it
  // was sold for. Left unpaid and logged rather than guessed at: a short
  // payment is a human decision, not something to round away.
  if (event.amountPaise !== undefined && event.amountPaise !== booking.totalFarePaise) {
    console.error(
      `[payments] amount mismatch on booking ${booking.id}: ` +
        `gateway ${event.amountPaise} vs fare ${booking.totalFarePaise} - not settling`,
    );
    recordPaymentEvent(payments.name, 'upi', 'amount_mismatch');
    return { handled: false, reason: 'amount does not match the booking fare' };
  }

  const outcome = await markPaid(booking.id, event.paymentId);

  // Same case as confirmPayment, arriving the other way. The gateway gets a 200
  // - it did nothing wrong and retrying will not help - but the captured money
  // is logged as owed rather than quietly written onto a cancelled trip.
  if (outcome === 'cancelled') {
    recordPaymentEvent(payments.name, 'upi', 'paid_after_cancel');
    console.error(
      `[payments] webhook captured ${event.paymentId} for cancelled booking ${booking.id} - refund owed`,
    );
    return { handled: false, bookingId: booking.id, reason: 'booking was cancelled; refund owed' };
  }

  recordPaymentEvent(payments.name, 'upi', outcome === 'settled' ? 'paid_webhook' : 'duplicate');
  return { handled: true, bookingId: booking.id, alreadyPaid: outcome === 'already_paid' };
}
