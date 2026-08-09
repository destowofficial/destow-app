import { and, eq, ne } from 'drizzle-orm';
import { formatPaise } from '../../lib/pricing/money.js';
import type { PaymentMethod } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { bookings } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { payments } from '../../lib/adapters/payments.js';
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

export interface QrPayment {
  bookingId: string;
  qrId: string;
  // The UPI payload the client renders. Any UPI app reads it.
  payload: string;
  amountPaise: number;
  amountDisplay: string;
  expiresAt: string;
  alreadyPaid: boolean;
}

// Raise a QR for exactly what this trip cost.
//
// The amount is never in the request. The client asks for a QR for a booking;
// the server decides what that booking is worth. There is nothing stored to
// charge against and no standing permission - the QR is the whole
// authorisation, and it dies with the payment.
export async function startQrPayment(
  customerUserId: string,
  bookingId: string,
): Promise<QrPayment> {
  const booking = await ownBooking(customerUserId, bookingId);

  if (booking.paymentStatus === 'paid') {
    return {
      bookingId: booking.id,
      qrId: '',
      payload: '',
      amountPaise: booking.totalFarePaise,
      amountDisplay: formatPaise(booking.totalFarePaise),
      expiresAt: new Date().toISOString(),
      alreadyPaid: true,
    };
  }
  if (booking.status === 'cancelled') {
    throw AppError.conflict('That booking was cancelled');
  }
  // The fare is only final once the driver has closed the trip with an
  // odometer reading. Raising a QR before that would ask for the estimate.
  if (booking.status !== 'completed' || booking.actualDistanceM === null) {
    throw AppError.conflict('This trip cannot be paid for until it has finished');
  }

  const qr = await payments.createUpiQr({
    bookingId: booking.id,
    amountPaise: booking.totalFarePaise,
  });

  await db
    .update(bookings)
    .set({ paymentOrderId: qr.qrId, paymentMethod: 'upi' })
    .where(eq(bookings.id, booking.id));

  return {
    bookingId: booking.id,
    qrId: qr.qrId,
    payload: qr.payload,
    amountPaise: qr.amountPaise,
    amountDisplay: formatPaise(qr.amountPaise),
    expiresAt: qr.expiresAt,
    alreadyPaid: false,
  };
}

// What the QR screen polls while the customer is paying. Deliberately tiny: it
// is called every couple of seconds by a phone with a QR on screen.
export async function paymentStatus(
  customerUserId: string,
  bookingId: string,
): Promise<{ bookingId: string; paymentStatus: string; paidAt: string | null }> {
  const [row] = await db
    .select({
      id: bookings.id,
      paymentStatus: bookings.paymentStatus,
      paidAt: bookings.paidAt,
    })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerUserId, customerUserId)))
    .limit(1);
  if (!row) throw AppError.notFound('Booking not found');
  return {
    bookingId: row.id,
    paymentStatus: row.paymentStatus,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
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

  let event: { qrId?: string; paymentId?: string; status?: string; amountPaise?: number };
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    // A QR credit carries both entities: the payment that arrived and the QR it
    // was scanned from. The QR is what ties it back to a booking. Razorpay nests
    // them; the stub sends flat, so both shapes are accepted until real events
    // are available to pin it against.
    const payload = parsed.payload as
      | Record<string, Record<string, Record<string, unknown>>>
      | undefined;
    const payment = (payload?.payment?.entity as Record<string, unknown> | undefined) ?? parsed;
    const qr = (payload?.qr_code?.entity as Record<string, unknown> | undefined) ?? parsed;
    event = {
      qrId: (qr.id ?? payment.qr_code_id) as string | undefined,
      paymentId: payment.id as string | undefined,
      status: payment.status as string | undefined,
      // Razorpay reports amounts in paise, the same unit we store.
      amountPaise: typeof payment.amount === 'number' ? payment.amount : undefined,
    };
  } catch (err) {
    console.error(`[payments] unparseable webhook body: ${safeError(err)}`);
    throw AppError.badRequest('Malformed webhook body');
  }

  if (!event.qrId || !event.paymentId) {
    throw AppError.badRequest('Webhook is missing the QR or payment id');
  }
  // Only a captured payment settles a booking. An 'authorized' event means the
  // money is held, not taken.
  if (event.status && event.status !== 'captured') {
    return { handled: false, reason: `ignored status ${event.status}` };
  }

  const [booking] = await db
    .select({ id: bookings.id, totalFarePaise: bookings.totalFarePaise })
    .from(bookings)
    .where(eq(bookings.paymentOrderId, event.qrId))
    .limit(1);

  // Acknowledge unknown QRs rather than erroring: a 4xx makes the gateway retry
  // an event we will never recognise.
  if (!booking) return { handled: false, reason: 'no booking for that QR' };

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
