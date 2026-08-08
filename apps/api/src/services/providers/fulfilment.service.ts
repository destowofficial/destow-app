import { and, count, desc, eq, sum } from 'drizzle-orm';
import type { BookingStatus } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { bookings, drivers, vehicles, vehicleTypes, users } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { assertTransition } from '../../lib/bookings/lifecycle.js';
import { formatPaise } from '../../lib/pricing/money.js';
import { serviceProviders } from '../../db/schema.js';

// The partner's side of a booking: accept it, put a driver on it, run it, finish
// it. Completion is the moment commission becomes real revenue, which is why
// every step before it is gated by the lifecycle rather than by trust.

async function ownProviderId(userId: string): Promise<string> {
  const [row] = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(eq(serviceProviders.ownerUserId, userId))
    .limit(1);
  if (!row) throw AppError.notFound('No provider profile for this account');
  return row.id;
}

// Load a booking already scoped to the caller's own provider. Another partner's
// booking matches nothing, so there is no ownership check to forget and no id to
// tamper with.
async function ownBooking(userId: string, bookingId: string) {
  const providerId = await ownProviderId(userId);
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.serviceProviderId, providerId)))
    .limit(1);
  if (!row) throw AppError.notFound('Booking not found');
  return { providerId, booking: row };
}

// One place every status change goes through. The WHERE clause repeats the
// expected current status so two concurrent calls cannot both succeed: the
// second matches zero rows rather than double-completing a trip and accruing
// commission twice.
async function transition(
  bookingId: string,
  from: BookingStatus,
  to: BookingStatus,
  extra: Partial<typeof bookings.$inferInsert> = {},
) {
  assertTransition(from, to);
  const [updated] = await db
    .update(bookings)
    .set({ status: to, ...extra })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, from)))
    .returning();
  if (!updated) throw AppError.conflict('That booking changed while you were working on it');
  return updated;
}

export async function listProviderBookings(userId: string, status?: BookingStatus) {
  const providerId = await ownProviderId(userId);
  const where = status
    ? and(eq(bookings.serviceProviderId, providerId), eq(bookings.status, status))
    : eq(bookings.serviceProviderId, providerId);

  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      from: bookings.fromLocation,
      to: bookings.toLocation,
      distanceM: bookings.distanceM,
      pickupDatetime: bookings.pickupDatetime,
      tripType: bookings.tripType,
      // A partner sees their own economics in full - unlike the customer, the
      // commission is exactly what this row means to them.
      totalFarePaise: bookings.totalFarePaise,
      commissionBps: bookings.commissionBps,
      commissionPaise: bookings.commissionPaise,
      providerPayoutPaise: bookings.providerPayoutPaise,
      vehicleTypeName: vehicleTypes.name,
      registrationNo: vehicles.registrationNo,
      driverName: bookings.driverName,
      driverPhone: bookings.driverPhone,
      customerName: users.name,
      customerPhone: users.phone,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, bookings.vehicleTypeId))
    .innerJoin(users, eq(users.id, bookings.customerUserId))
    .where(where)
    .orderBy(desc(bookings.createdAt));

  // A pending request is still an offer. Withhold the customer's number until
  // the partner has actually accepted the trip, so browsing the incoming queue
  // is not a way to harvest phone numbers.
  return rows.map((r) => ({
    ...r,
    customerPhone: r.status === 'pending' || r.status === 'cancelled' ? null : r.customerPhone,
  }));
}

export async function acceptBooking(userId: string, bookingId: string) {
  const { booking } = await ownBooking(userId, bookingId);
  return transition(booking.id, booking.status, 'confirmed');
}

export async function rejectBooking(userId: string, bookingId: string) {
  const { booking } = await ownBooking(userId, bookingId);
  return transition(booking.id, booking.status, 'cancelled', {
    cancelledAt: new Date(),
    cancelledBy: 'provider',
  });
}

export async function assignDriver(userId: string, bookingId: string, driverId: string) {
  const { providerId, booking } = await ownBooking(userId, bookingId);

  // The driver must be this partner's own and currently active. Assigning
  // someone else's driver would hand their personal number to a stranger's
  // customer, and an inactive driver is one who has left.
  const [driver] = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.id, driverId), eq(drivers.serviceProviderId, providerId)))
    .limit(1);
  if (!driver) throw AppError.notFound('Driver not found');
  if (driver.status !== 'active') {
    throw AppError.conflict('That driver is not active');
  }

  return transition(booking.id, booking.status, 'assigned', {
    driverId: driver.id,
    // Snapshotted, not joined: the customer's record of who drove them must
    // survive the driver later leaving the agency or changing their number.
    driverName: driver.name,
    driverPhone: driver.phone,
  });
}

export async function startTrip(userId: string, bookingId: string) {
  const { booking } = await ownBooking(userId, bookingId);
  return transition(booking.id, booking.status, 'ongoing');
}

export async function completeTrip(userId: string, bookingId: string) {
  const { booking } = await ownBooking(userId, bookingId);
  // The commission was frozen onto this row at creation; completing is what
  // turns it from a quoted number into earned revenue, and completedAt is the
  // date that revenue belongs to.
  return transition(booking.id, booking.status, 'completed', { completedAt: new Date() });
}

export interface ProviderEarnings {
  completedTrips: number;
  grossPaise: number;
  commissionPaise: number;
  netPayoutPaise: number;
  grossDisplay: string;
  commissionDisplay: string;
  netPayoutDisplay: string;
}

// Earnings are derived from completed bookings rather than a separate ledger:
// the booking row already holds the frozen gross, commission and payout, so a
// ledger would duplicate it. A ledger earns its place when payouts start and
// something has to record what has been settled.
export async function getEarnings(userId: string): Promise<ProviderEarnings> {
  const providerId = await ownProviderId(userId);
  const [row] = await db
    .select({
      trips: count(),
      gross: sum(bookings.totalFarePaise),
      commission: sum(bookings.commissionPaise),
      net: sum(bookings.providerPayoutPaise),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.serviceProviderId, providerId),
        eq(bookings.status, 'completed'),
        // A completed trip nobody paid for is not earnings. Counting it would
        // show a partner money that is owed by a customer, not by Destow, and
        // would overstate commission on the platform's side too.
        eq(bookings.paymentStatus, 'paid'),
      ),
    );

  // sum() returns null over an empty set and a string for bigint totals.
  const gross = Number(row?.gross ?? 0);
  const commission = Number(row?.commission ?? 0);
  const net = Number(row?.net ?? 0);

  return {
    completedTrips: row?.trips ?? 0,
    grossPaise: gross,
    commissionPaise: commission,
    netPayoutPaise: net,
    grossDisplay: formatPaise(gross),
    commissionDisplay: formatPaise(commission),
    netPayoutDisplay: formatPaise(net),
  };
}
