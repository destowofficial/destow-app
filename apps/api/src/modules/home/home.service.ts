import { and, count, eq, ne } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { users, bookings } from '../../db/schema.js';

export async function getUserHomeInfo(userId: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [tripCount] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(eq(bookings.customerUserId, userId), ne(bookings.status, 'cancelled')));

  return { user, totalTrips: tripCount?.count ?? 0 };
}

// Deterministic distance estimate (stable per route) until a Maps provider is wired.
// TODO: replace with Google Distance Matrix.
export async function searchRoute(from: string, to: string, date: string, time: string) {
  const key = `${from.trim().toLowerCase()}→${to.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const distanceKm = 120 + (hash % 680); // stable 120–800 km
  const estimatedDurationHrs = Math.round((distanceKm / 50) * 10) / 10; // ~50 km/h
  return { from, to, date, time, distanceKm, estimatedDurationHrs, searchId: `${key}|${date}|${time}` };
}
