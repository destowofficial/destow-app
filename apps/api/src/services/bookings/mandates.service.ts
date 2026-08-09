import { and, desc, eq, ne } from 'drizzle-orm';
import type {
  ConfirmMandateBody,
  CustomerPaymentMethod,
  MandateSetup,
  SetupMandateBody,
} from '@destow/contracts';
import { MANDATE_MAX_AMOUNT_PAISE } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { paymentMethods } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { payments } from '../../lib/adapters/payments.js';
import { formatPaise } from '../../lib/pricing/money.js';
import { recordPaymentEvent } from '../../lib/metrics/metrics.js';
import { safeError } from '../../lib/log/safe.js';

// Standing permission to charge after a trip.
//
// Destow bills the distance actually driven, which is only known once the
// vehicle is back. Without a mandate that model has no ending: a customer can
// confirm the odometer and never pay, and a cancellation fee is a number we
// write down and can never collect. This is the piece that closes it.
//
// What is stored is a gateway token. Not a card number, not anything that works
// outside our own account - which is what makes keeping it reasonable.

// How long a mandate stands before the customer has to approve one again.
const MANDATE_YEARS = 2;

function toCustomerPaymentMethod(row: typeof paymentMethods.$inferSelect): CustomerPaymentMethod {
  return {
    id: row.id,
    method: row.method,
    status: row.status,
    label: row.label,
    maxAmountPaise: row.maxAmountPaise,
    maxAmountDisplay: formatPaise(row.maxAmountPaise),
    isDefault: row.status === 'active',
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    // Deliberately absent: token, providerCustomerId, authPaymentId. None of
    // them mean anything to a client, and all of them are worth stealing.
  };
}

// Opens an authorisation. Takes no money - the amount is zero and the point is
// the token that comes back once the customer approves.
export async function setupMandate(
  userId: string,
  body: SetupMandateBody,
): Promise<MandateSetup> {
  const auth = await payments.authoriseMandate({
    userId,
    maxAmountPaise: MANDATE_MAX_AMOUNT_PAISE,
    method: 'upi',
    vpa: body.vpa,
  });

  // A pending row so the callback has something to attach to. Not active, and
  // not chargeable, until the customer has actually approved it.
  const [created] = await db
    .insert(paymentMethods)
    .values({
      userId,
      provider: payments.name,
      providerCustomerId: auth.customerRef,
      method: 'upi',
      label: body.vpa,
      maxAmountPaise: MANDATE_MAX_AMOUNT_PAISE,
      status: 'pending',
    })
    .returning();

  return {
    mandateId: created.id,
    orderId: auth.orderId,
    customerRef: auth.customerRef,
    maxAmountPaise: MANDATE_MAX_AMOUNT_PAISE,
    provider: payments.name,
    vpa: body.vpa,
  };
}

// The customer approved it. The signature is what makes the token trustworthy:
// without verifying it, a client could hand us any string and we would charge
// against it later, with nobody watching.
export async function confirmMandate(
  userId: string,
  body: ConfirmMandateBody,
): Promise<CustomerPaymentMethod> {
  const [pending] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, body.mandateId), eq(paymentMethods.userId, userId)))
    .limit(1);
  if (!pending) throw AppError.notFound('Payment method not found');

  // Idempotent: a retry after a dropped response returns what already exists
  // rather than activating a second mandate.
  if (pending.status === 'active') return toCustomerPaymentMethod(pending);
  if (pending.status !== 'pending') {
    throw AppError.conflict('That authorisation is no longer valid');
  }

  if (!payments.verifyMandate({
    orderId: body.orderId,
    paymentId: body.paymentId,
    signature: body.signature,
  })) {
    recordPaymentEvent(payments.name, pending.method, 'mandate_bad_signature');
    throw AppError.badRequest('That authorisation could not be verified');
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + MANDATE_YEARS);

  // One active mandate per customer, enforced by a partial unique index.
  // Charging happens automatically with nobody watching, so "which method did
  // it use" has to have exactly one answer - retire the old one first.
  return db.transaction(async (tx) => {
    await tx
      .update(paymentMethods)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(
          eq(paymentMethods.userId, userId),
          eq(paymentMethods.status, 'active'),
          ne(paymentMethods.id, pending.id),
        ),
      );

    const [activated] = await tx
      .update(paymentMethods)
      .set({
        status: 'active',
        token: body.token,
        label: body.label ?? null,
        authPaymentId: body.paymentId,
        activatedAt: new Date(),
        expiresAt,
      })
      .where(and(eq(paymentMethods.id, pending.id), eq(paymentMethods.status, 'pending')))
      .returning();
    if (!activated) throw AppError.conflict('That authorisation changed while you were approving it');

    recordPaymentEvent(payments.name, activated.method, 'mandate_active');
    return toCustomerPaymentMethod(activated);
  });
}

export async function listMyPaymentMethods(userId: string): Promise<CustomerPaymentMethod[]> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), ne(paymentMethods.status, 'pending')))
    .orderBy(desc(paymentMethods.createdAt));
  return rows.map(toCustomerPaymentMethod);
}

// Withdrawing permission. Deliberately does not touch trips already run and
// unpaid - the debt survives the method it was going to be collected through.
export async function revokeMandate(userId: string, mandateId: string): Promise<void> {
  const [row] = await db
    .update(paymentMethods)
    .set({ status: 'revoked', revokedAt: new Date(), token: null })
    .where(
      and(
        eq(paymentMethods.id, mandateId),
        eq(paymentMethods.userId, userId),
        eq(paymentMethods.status, 'active'),
      ),
    )
    .returning({ id: paymentMethods.id });
  if (!row) throw AppError.notFound('Payment method not found');
}

export async function activeMandate(userId: string) {
  const [row] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.status, 'active')))
    .limit(1);
  return row ?? null;
}

export interface ChargeOutcome {
  charged: boolean;
  paymentId?: string;
  reason?: string;
}

// Charge an amount the server computed against the customer's standing mandate.
//
// Never throws for a payment failure. Everything calling this has already done
// something that must not be undone - a trip is finished and agreed, or a
// booking is cancelled - and a gateway outage is not a reason to roll that back.
// A failure leaves the amount owed and visible, which is the honest state.
export async function chargeCustomer(input: {
  userId: string;
  bookingId: string;
  amountPaise: number;
}): Promise<ChargeOutcome> {
  if (input.amountPaise <= 0) return { charged: false, reason: 'nothing to charge' };

  const mandate = await activeMandate(input.userId);
  if (!mandate || !mandate.token) {
    recordPaymentEvent(payments.name, 'upi', 'charge_no_mandate');
    return { charged: false, reason: 'no active payment method' };
  }

  // The gateway refuses anything above the ceiling the customer agreed to, so
  // catching it here turns a hard failure into a clear one.
  if (input.amountPaise > mandate.maxAmountPaise) {
    recordPaymentEvent(payments.name, mandate.method, 'charge_over_mandate_cap');
    console.error(
      `[payments] ${input.amountPaise} exceeds the mandate cap ${mandate.maxAmountPaise} ` +
        `for booking ${input.bookingId} - needs paying by hand`,
    );
    return { charged: false, reason: 'amount exceeds the agreed limit' };
  }

  try {
    const charge = await payments.chargeMandate({
      token: mandate.token,
      customerRef: mandate.providerCustomerId ?? '',
      amountPaise: input.amountPaise,
      bookingId: input.bookingId,
    });
    return { charged: true, paymentId: charge.paymentId };
  } catch (err) {
    recordPaymentEvent(payments.name, mandate.method, 'charge_failed');
    console.error(
      `[payments] mandate charge failed for booking ${input.bookingId}: ${safeError(err)}`,
    );
    return { charged: false, reason: 'the payment could not be taken' };
  }
}
