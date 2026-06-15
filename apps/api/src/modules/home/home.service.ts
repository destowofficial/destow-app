import { db } from '../../db/connection.js';
import { users, bookings } from '../../db/schema.js';
import { eq, count, sql } from 'drizzle-orm';

export async function getUserHomeInfo(userId: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [tripCountResult] = await db
    .select({ count: count() })
    .from(bookings)
    .where(eq(bookings.userId, userId));

  return {
    user,
    totalTrips: tripCountResult?.count ?? 0,
  };
}

/**
 * Searches for a route and estimates distance.
 * In a real app this would call Google Maps Distance Matrix API.
 * For now returns a mocked distance estimate.
 */
export async function searchRoute(from: string, to: string, date: string, time: string) {
  // TODO: Integrate Google Maps Distance Matrix API for real distance/duration
  const mockDistanceKm = Math.floor(Math.random() * 800) + 100; // 100-900 km
  const mockDurationHrs = Math.round(mockDistanceKm / 60 * 10) / 10;

  return {
    from,
    to,
    date,
    time,
    distanceKm: mockDistanceKm,
    estimatedDurationHrs: mockDurationHrs,
    searchId: `${Date.now()}`, // transient ID for this search session
  };
}
