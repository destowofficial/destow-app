import { db } from '../../db/connection.js';
import { bookings, cabs, cabTypes } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function getHistory(userId: string, page: number, limit: number, status?: string) {
  const offset = (page - 1) * limit;

  const query = db
    .select({
      id: bookings.id,
      fromLocation: bookings.fromLocation,
      toLocation: bookings.toLocation,
      pickupDatetime: bookings.pickupDatetime,
      distanceKm: bookings.distanceKm,
      totalFare: bookings.totalFare,
      status: bookings.status,
      paymentMethod: bookings.paymentMethod,
      paymentStatus: bookings.paymentStatus,
      createdAt: bookings.createdAt,
      agencyName: cabs.agencyName,
      cabTypeName: cabTypes.name,
      seats: cabTypes.seats,
    })
    .from(bookings)
    .innerJoin(cabs, eq(bookings.cabId, cabs.id))
    .innerJoin(cabTypes, eq(cabs.cabTypeId, cabTypes.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset);

  const results = await query;
  return {
    trips: results,
    pagination: { page, limit, count: results.length },
  };
}
