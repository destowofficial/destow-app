import { and, count, desc, eq } from 'drizzle-orm';
import type {
  CreateBookingBody,
  CustomerBooking,
  ListBookingsQuery,
  Paginated,
} from '@destow/contracts';
import { db } from '../../db/connection.js';
import {
  bookings,
  platformSettings,
  vehicles,
  vehicleTypes,
  serviceProviders,
} from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { assertTransition } from '../../lib/bookings/lifecycle.js';
import { computeRefund } from '../../lib/pricing/refund.js';
import { payments } from '../../lib/adapters/payments.js';
import { safeError } from '../../lib/log/safe.js';
import { resolveDistance } from '../../lib/adapters/route.js';
import { computeFare } from '../../lib/pricing/pricing.js';
import { formatPaise, clampCommissionBps } from '../../lib/pricing/money.js';

// Drizzle wraps driver errors, so the Postgres SQLSTATE sits on the cause rather
// than the thrown object.
function sqlStateOf(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

// Booking creation is where a quote becomes a commitment. Everything about the
// money is computed here and frozen onto the row: a later rate change, a
// commission change, or a different distance from the maps provider must never
// alter what an existing booking was agreed at.

type Row = {
  booking: typeof bookings.$inferSelect;
  type: typeof vehicleTypes.$inferSelect;
  vehicle: typeof vehicles.$inferSelect;
  provider: typeof serviceProviders.$inferSelect;
};

function toCustomerBooking(r: Row): CustomerBooking {
  return {
    id: r.booking.id,
    status: r.booking.status,
    paymentStatus: r.booking.paymentStatus,
    from: r.booking.fromLocation,
    to: r.booking.toLocation,
    distanceM: r.booking.distanceM,
    tripType: r.booking.tripType,
    pickupDatetime: r.booking.pickupDatetime.toISOString(),
    returnDatetime: r.booking.returnDatetime?.toISOString() ?? null,
    pricePerKmPaise: r.booking.pricePerKmPaise,
    totalFarePaise: r.booking.totalFarePaise,
    totalFareDisplay: formatPaise(r.booking.totalFarePaise),
    vehicleTypeName: r.type.name,
    modelName: r.vehicle.modelName,
    registrationNo: r.vehicle.registrationNo,
    providerName: r.provider.agencyName,
    driverName: r.booking.driverName,
    driverPhone: r.booking.driverPhone,
    createdAt: r.booking.createdAt.toISOString(),
    // Absent by design: commissionBps, commissionPaise, providerPayoutPaise.
  };
}

const detailSelect = {
  booking: bookings,
  type: vehicleTypes,
  vehicle: vehicles,
  provider: serviceProviders,
};

function joinedBookings() {
  return db
    .select(detailSelect)
    .from(bookings)
    .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, bookings.vehicleTypeId))
    .innerJoin(serviceProviders, eq(serviceProviders.id, bookings.serviceProviderId));
}

export async function createBooking(
  customerUserId: string,
  body: CreateBookingBody,
): Promise<CustomerBooking> {
  // Re-resolve the vehicle rather than trusting anything cached client-side: it
  // may have been unlisted, deactivated or unapproved since the quote was shown.
  const [found] = await db
    .select({ vehicle: vehicles, type: vehicleTypes, provider: serviceProviders })
    .from(vehicles)
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, vehicles.vehicleTypeId))
    .innerJoin(serviceProviders, eq(serviceProviders.id, vehicles.serviceProviderId))
    .where(eq(vehicles.id, body.vehicleId))
    .limit(1);

  if (!found) throw AppError.notFound('Vehicle not found');

  // The same three gates the listing applies. Checked again here because the
  // listing is a moment in time and this is the moment that counts.
  if (
    found.provider.status !== 'approved' ||
    found.vehicle.status !== 'approved' ||
    !found.vehicle.isActive
  ) {
    throw AppError.conflict('That vehicle is no longer available to book');
  }

  const distance = await resolveDistance(body.from, body.to);

  // How long this trip takes the vehicle off the market. A round trip is held
  // until the customer brings it back; a one-way for the drive itself. The
  // max() guards a return date entered earlier than the journey can physically
  // finish, which would otherwise free the vehicle mid-trip.
  const driveEndsAt = new Date(body.pickupDatetime.getTime() + distance.durationS * 1000);
  const occupiedUntil =
    body.returnDatetime && body.returnDatetime > driveEndsAt ? body.returnDatetime : driveEndsAt;

  const [settings] = await db
    .select({ bps: platformSettings.commissionBps })
    .from(platformSettings)
    .limit(1);
  const commissionBps = clampCommissionBps(
    found.provider.commissionBpsOverride ?? settings?.bps ?? 1800,
  );

  // The single place the money is decided. Same engine as the quote, same
  // inputs, so the price a customer was shown is the price they get.
  const fare = computeFare({
    pricePerKmPaise: found.vehicle.pricePerKmPaise,
    distanceM: distance.distanceM,
    commissionBps,
    // A round trip is both legs, so the charged distance is twice the route.
    tripType: body.tripType,
  });

  let created: typeof bookings.$inferSelect;
  try {
    [created] = await db
    .insert(bookings)
    .values({
      customerUserId,
      serviceProviderId: found.provider.id,
      vehicleId: found.vehicle.id,
      vehicleTypeId: found.type.id,
      fromLocation: body.from,
      toLocation: body.to,
      distanceM: fare.distanceM,
      tripType: body.tripType,
      pickupDatetime: body.pickupDatetime,
      returnDatetime: body.returnDatetime,
      // --- frozen snapshot: never recomputed for this booking again ---
      pricePerKmPaise: fare.pricePerKmPaise,
      totalFarePaise: fare.totalFarePaise,
      commissionBps: fare.commissionBps,
      commissionPaise: fare.commissionPaise,
      providerPayoutPaise: fare.providerPayoutPaise,
      occupiedUntil,
      status: 'pending',
      paymentStatus: 'pending',
    })
    .returning();
  } catch (err) {
    // 23P01 is the exclusion constraint in migration 0007: this vehicle is
    // already held for an overlapping window. The database decides this, not a
    // prior SELECT, so two simultaneous bookings cannot both succeed.
    if (sqlStateOf(err) === '23P01') {
      throw AppError.conflict('That vehicle is already booked for those dates');
    }
    throw err;
  }

  return toCustomerBooking({
    booking: created,
    type: found.type,
    vehicle: found.vehicle,
    provider: found.provider,
  });
}

export async function getMyBooking(
  customerUserId: string,
  bookingId: string,
): Promise<CustomerBooking> {
  // Scoped by customer as well as id: someone else's booking matches nothing and
  // reads as "not found", which is both true for this caller and non-disclosing.
  const [row] = await joinedBookings()
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerUserId, customerUserId)))
    .limit(1);
  if (!row) throw AppError.notFound('Booking not found');
  return toCustomerBooking(row);
}

export async function listMyBookings(
  customerUserId: string,
  query: ListBookingsQuery,
): Promise<Paginated<CustomerBooking>> {
  const where = query.status
    ? and(eq(bookings.customerUserId, customerUserId), eq(bookings.status, query.status))
    : eq(bookings.customerUserId, customerUserId);

  // A real total, not the page length: the old backend returned the row count of
  // the current page as `count`, so a client could never render "page 2 of 5".
  const [{ total }] = await db.select({ total: count() }).from(bookings).where(where);

  const rows = await joinedBookings()
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    items: rows.map(toCustomerBooking),
    total,
    page: query.page,
    limit: query.limit,
  };
}

// A customer may call off a trip that has not started. Once it is ongoing the
// vehicle is on the road with them in it, and that becomes a refund
// conversation rather than a cancellation.
export async function cancelMyBooking(
  customerUserId: string,
  bookingId: string,
): Promise<CustomerBooking> {
  const [existing] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerUserId, customerUserId)))
    .limit(1);
  if (!existing) throw AppError.notFound('Booking not found');

  assertTransition(existing.status, 'cancelled');

  // Claim the cancellation FIRST, and only then move money. Repeating the
  // expected status in the WHERE clause means two taps of Cancel cannot both
  // win, so the refund below runs exactly once - refunding before claiming
  // would let a double tap issue two refunds.
  const [updated] = await db
    .update(bookings)
    .set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'customer' })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, existing.status)))
    .returning({ id: bookings.id });
  if (!updated) throw AppError.conflict('That booking changed while you were cancelling it');

  if (existing.paymentStatus === 'paid') {
    await refundCancelledBooking(existing);
  }

  return getMyBooking(customerUserId, bookingId);
}

// Return the fare, minus whatever the policy retains for the partner. Called
// only after the cancellation has been claimed, so it runs once per booking.
async function refundCancelledBooking(booking: typeof bookings.$inferSelect): Promise<void> {
  const [settings] = await db
    .select({
      freeHours: platformSettings.cancellationFreeHours,
      feeBps: platformSettings.cancellationFeeBps,
    })
    .from(platformSettings)
    .limit(1);

  const breakdown = computeRefund({
    totalFarePaise: booking.totalFarePaise,
    pickupAt: booking.pickupDatetime,
    cancelledAt: new Date(),
    policy: { freeHours: settings?.freeHours ?? 24, feeBps: settings?.feeBps ?? 2500 },
  });

  // Record the outcome even when nothing is returned, so a late cancellation
  // shows why the customer got nothing back rather than looking like a bug.
  const record = {
    refundPaise: breakdown.refundPaise,
    cancellationFeePaise: breakdown.cancellationFeePaise,
    refundedAt: new Date(),
  };

  if (breakdown.refundPaise === 0) {
    await db.update(bookings).set(record).where(eq(bookings.id, booking.id));
    return;
  }

  try {
    const refund = await payments.refund({
      paymentId: booking.transactionRef ?? '',
      amountPaise: breakdown.refundPaise,
    });
    await db
      .update(bookings)
      .set({ ...record, paymentStatus: 'refunded', refundRef: refund.refundId })
      .where(eq(bookings.id, booking.id));
  } catch (err) {
    // The trip is already cancelled and must stay cancelled - a gateway outage
    // is not a reason to put a customer back on a trip they called off. Leave
    // payment_status as 'paid' so the booking is visibly owed a refund and can
    // be retried or settled by hand, rather than silently marked refunded.
    console.error(`[payments] refund failed for booking ${booking.id}: ${safeError(err)}`);
    await db.update(bookings).set(record).where(eq(bookings.id, booking.id));
  }
}
