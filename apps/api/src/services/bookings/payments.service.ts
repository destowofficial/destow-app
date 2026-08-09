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
async function markPaid(
  bookingId: string,
  paymentId: string,
  method?: PaymentMethod,
): Promise<'settled' | 'already_paid'> {
  const updated = await db
    .update(bookings)
    .set({
      paymentStatus: 'paid',
      transactionRef: paymentId,
      paidAt: new Date(),
      ...(method ? { paymentMethod: method } : {}),
    })
    .where(and(eq(bookings.id, bookingId), ne(bookings.paymentStatus, 'paid')))
    .returning({ id: bookings.id });

  return updated.length > 0 ? 'settled' : 'already_paid';
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
  recordPaymentEvent(payments.name, 'upi', outcome === 'settled' ? 'paid_webhook' : 'duplicate');
  return { handled: true, bookingId: booking.id, alreadyPaid: outcome === 'already_paid' };
}
