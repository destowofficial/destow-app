import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { bookings, vehicleTypes, serviceProviders } from '../../db/schema.js';
import { paiseToRupees } from '../../lib/money.js';
import type { BookingStatus } from '@destow/contracts';

export async function getHistory(
  userId: string,
  page: number,
  limit: number,
  status?: BookingStatus,
) {
  const offset = (page - 1) * limit;
  const where = status
    ? and(eq(bookings.customerUserId, userId), eq(bookings.status, status))
    : eq(bookings.customerUserId, userId);

  const rows = await db
    .select({
      id: bookings.id,
      fromLocation: bookings.fromLocation,
      toLocation: bookings.toLocation,
      pickupDatetime: bookings.pickupDatetime,
      distanceM: bookings.distanceM,
      totalFarePaise: bookings.totalFarePaise,
      status: bookings.status,
      paymentMethod: bookings.paymentMethod,
      paymentStatus: bookings.paymentStatus,
      createdAt: bookings.createdAt,
      agencyName: serviceProviders.agencyName,
      cabTypeName: vehicleTypes.name,
      seats: vehicleTypes.seats,
    })
    .from(bookings)
    // LEFT joins so a trip is never dropped if its vehicle/type/provider is removed.
    .leftJoin(vehicleTypes, eq(bookings.vehicleTypeId, vehicleTypes.id))
    .leftJoin(serviceProviders, eq(bookings.serviceProviderId, serviceProviders.id))
    .where(where)
    .orderBy(desc(bookings.createdAt), desc(bookings.id)) // stable pagination
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(bookings)
    .where(where);

  const items = rows.map((r) => ({
    id: r.id,
    fromLocation: r.fromLocation,
    toLocation: r.toLocation,
    pickupDatetime: r.pickupDatetime,
    distanceKm: r.distanceM / 1000,
    totalFare: paiseToRupees(r.totalFarePaise),
    status: r.status,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt,
    agencyName: r.agencyName,
    cabType: { name: r.cabTypeName, seats: r.seats },
  }));

  return { bookings: items, total, page, limit };
}
