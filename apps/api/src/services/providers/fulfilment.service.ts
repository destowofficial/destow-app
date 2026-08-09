import { and, count, desc, eq, ne, sum } from 'drizzle-orm';
import type { BookingStatus, SubmitOdometerBody } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { bookings, drivers, vehicles, vehicleTypes, users } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { assertTransition } from '../../lib/bookings/lifecycle.js';
import { formatPaise } from '../../lib/pricing/money.js';
import { computeFare } from '../../lib/pricing/pricing.js';
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

// Paginated, like the customer's own history. This response joins customer
// names and phone numbers, so an unbounded version would hand a partner their
// entire customer list in one request - and grow slower every month besides.
const MAX_PAGE = 50;

export async function listProviderBookings(
  userId: string,
  status?: BookingStatus,
  page = 1,
  limit = 20,
) {
  const providerId = await ownProviderId(userId);
  const take = Math.min(Math.max(limit, 1), MAX_PAGE);
  const skip = (Math.max(page, 1) - 1) * take;

  const where = status
    ? and(eq(bookings.serviceProviderId, providerId), eq(bookings.status, status))
    : eq(bookings.serviceProviderId, providerId);

  const [{ total }] = await db.select({ total: count() }).from(bookings).where(where);

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
    .orderBy(desc(bookings.createdAt))
    .limit(take)
    .offset(skip);

  // A pending request is still an offer. Withhold the customer's number until
  // the partner has actually accepted the trip, so browsing the incoming queue
  // is not a way to harvest phone numbers.
  const items = rows.map((r) => ({
    ...r,
    customerPhone: r.status === 'pending' || r.status === 'cancelled' ? null : r.customerPhone,
  }));

  return { items, total, page: Math.max(page, 1), limit: take };
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

// Sanity bound on the odometer, expressed against the routed estimate rather
// than as an absolute: a fat-fingered closing reading (43512 typed as 435120)
// otherwise turns a Rs 21,000 trip into a Rs 210,000 one. The customer does
// confirm the figure, but "tap to approve" is a weak last line of defence
// against a number that should never have been storable. Generous on purpose -
// detours, local running and a wrong turn in the hills are all legitimate.
const MAX_ACTUAL_OVER_ESTIMATE = 3;

// The partner closes the trip by reporting what the vehicle actually ran. This
// does not charge anything and does not settle the fare: it records the reading
// and hands the customer something to confirm. Money moves in confirmDistance,
// after the person paying has seen the number.
export async function completeTrip(
  userId: string,
  bookingId: string,
  body: SubmitOdometerBody,
) {
  const { booking } = await ownBooking(userId, bookingId);

  const actualDistanceM = (body.odometerEndKm - body.odometerStartKm) * 1000;
  const estimateM = booking.distanceM;
  if (actualDistanceM > estimateM * MAX_ACTUAL_OVER_ESTIMATE) {
    throw AppError.unprocessable('Validation failed', {
      odometerEndKm: [
        `That is ${Math.round(actualDistanceM / 1000)} km against an estimated ` +
          `${Math.round(estimateM / 1000)} km. Check the readings.`,
      ],
    });
  }

  // The fare is settled here rather than in a separate step the customer has to
  // take. Paying is the agreement now: the customer sees these readings and this
  // total on the payment screen, and handing over the money is the acceptance.
  // Recomputed at the rate and commission frozen when the trip was booked, so a
  // price change since then cannot reach a trip already driven.
  const fare = computeFare({
    pricePerKmPaise: booking.pricePerKmPaise,
    distanceM: actualDistanceM,
    commissionBps: booking.commissionBps,
  });

  return transition(booking.id, booking.status, 'completed', {
    odometerStartKm: body.odometerStartKm,
    odometerEndKm: body.odometerEndKm,
    actualDistanceM,
    distanceSubmittedAt: new Date(),
    completedAt: new Date(),
    totalFarePaise: fare.totalFarePaise,
    commissionPaise: fare.commissionPaise,
    providerPayoutPaise: fare.providerPayoutPaise,
  });
}

// The driver has the cash in hand. Sliding to confirm is the receipt, and it is
// the driver's action rather than the customer's on purpose: the person holding
// the money is the honest source, and a customer cannot close a trip they never
// paid for.
export async function confirmCashCollected(userId: string, bookingId: string) {
  const { booking } = await ownBooking(userId, bookingId);

  if (booking.status !== 'completed') {
    throw AppError.conflict('That trip has not finished yet');
  }
  // Idempotent: a second slide, or a retry after a dropped response, returns the
  // booking as it stands rather than settling twice.
  if (booking.paymentStatus === 'paid') return booking;

  const [updated] = await db
    .update(bookings)
    .set({
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paidAt: new Date(),
      // No transaction reference: nothing moved through a gateway. The driver
      // took notes at the roadside, and this row is the whole record of it.
    })
    .where(and(eq(bookings.id, bookingId), ne(bookings.paymentStatus, 'paid')))
    .returning();

  return updated ?? booking;
}

export interface ProviderEarnings {
  completedTrips: number;
  grossPaise: number;
  commissionPaise: number;
  netPayoutPaise: number;
  grossDisplay: string;
  commissionDisplay: string;
  netPayoutDisplay: string;
  // --- Split by who actually holds the money ---------------------------------
  // Two settlement directions, and lumping them together tells a partner that
  // money is coming when it is not. On a UPI trip Destow collects the fare and
  // owes the partner the payout. On a cash trip the driver collects the whole
  // fare at the roadside, so Destow owes nothing and the partner owes Destow the
  // commission on it.
  onlineTrips: number;
  onlinePayoutDuePaise: number;
  onlinePayoutDueDisplay: string;
  cashTrips: number;
  cashCommissionDuePaise: number;
  cashCommissionDueDisplay: string;
  // Payable minus receivable. Positive: Destow owes the partner. Negative: the
  // partner owes Destow.
  netPositionPaise: number;
  netPositionDisplay: string;
}

export async function getEarnings(userId: string): Promise<ProviderEarnings> {
  const providerId = await ownProviderId(userId);
  const rows = await db
    .select({
      method: bookings.paymentMethod,
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
        // A completed trip nobody settled is not earnings. Counting it would
        // show a partner money that is owed by a customer, not by Destow.
        eq(bookings.paymentStatus, 'paid'),
      ),
    )
    .groupBy(bookings.paymentMethod);

  // sum() returns null over an empty set and a string for bigint totals.
  const n = (v: unknown) => Number(v ?? 0);
  let trips = 0, gross = 0, commission = 0, net = 0;
  let onlineTrips = 0, onlinePayoutDue = 0;
  let cashTrips = 0, cashCommissionDue = 0;

  for (const r of rows) {
    trips += r.trips;
    gross += n(r.gross);
    commission += n(r.commission);
    net += n(r.net);
    if (r.method === 'cash') {
      cashTrips += r.trips;
      // The partner already has the fare. What is outstanding is our cut of it.
      cashCommissionDue += n(r.commission);
    } else {
      onlineTrips += r.trips;
      onlinePayoutDue += n(r.net);
    }
  }

  const netPosition = onlinePayoutDue - cashCommissionDue;

  return {
    completedTrips: trips,
    grossPaise: gross,
    commissionPaise: commission,
    netPayoutPaise: net,
    grossDisplay: formatPaise(gross),
    commissionDisplay: formatPaise(commission),
    netPayoutDisplay: formatPaise(net),
    onlineTrips,
    onlinePayoutDuePaise: onlinePayoutDue,
    onlinePayoutDueDisplay: formatPaise(onlinePayoutDue),
    cashTrips,
    cashCommissionDuePaise: cashCommissionDue,
    cashCommissionDueDisplay: formatPaise(cashCommissionDue),
    netPositionPaise: netPosition,
    netPositionDisplay: formatPaise(Math.abs(netPosition)),
  };
}

