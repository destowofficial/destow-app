import { and, eq, sql } from 'drizzle-orm';
import type { BookingRating, CreateRatingBody } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { bookings, ratings, serviceProviders } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';

// One rating per completed trip, feeding the provider average the search
// listing already shows. Until now that average had no source: every partner
// read as unrated forever.

// Drizzle wraps driver errors, so the SQLSTATE sits on the cause.
function sqlStateOf(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

export async function rateBooking(
  customerUserId: string,
  bookingId: string,
  body: CreateRatingBody,
): Promise<BookingRating> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerUserId, customerUserId)))
    .limit(1);
  if (!booking) throw AppError.notFound('Booking not found');

  // Only a trip that actually happened. Rating a pending or cancelled booking
  // would let a partner's average be moved by trips they never ran - which is
  // both unfair and the obvious way to attack a competitor's rating.
  if (booking.status !== 'completed') {
    throw AppError.conflict('You can only rate a completed trip');
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(ratings)
        .values({
          bookingId: booking.id,
          customerUserId,
          serviceProviderId: booking.serviceProviderId,
          vehicleId: booking.vehicleId,
          rating: body.rating,
          comment: body.comment,
        })
        .returning();

      // Bump the aggregate in the same transaction, and as a SQL expression
      // rather than read-modify-write: two ratings landing together would
      // otherwise both read the old count and one increment would vanish.
      await tx
        .update(serviceProviders)
        .set({
          ratingSum: sql`${serviceProviders.ratingSum} + ${body.rating}`,
          ratingCount: sql`${serviceProviders.ratingCount} + 1`,
        })
        .where(eq(serviceProviders.id, booking.serviceProviderId));

      return row;
    });

    return {
      bookingId: created.bookingId,
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (err) {
    // ratings.booking_id is unique, so a second rating for the same trip is
    // rejected by the database rather than by a prior SELECT - two concurrent
    // submissions cannot both count.
    if (sqlStateOf(err) === '23505') {
      throw AppError.conflict('You have already rated this trip');
    }
    throw err;
  }
}

export async function getBookingRating(
  customerUserId: string,
  bookingId: string,
): Promise<BookingRating | null> {
  const [row] = await db
    .select({
      bookingId: ratings.bookingId,
      rating: ratings.rating,
      comment: ratings.comment,
      createdAt: ratings.createdAt,
    })
    .from(ratings)
    .innerJoin(bookings, eq(bookings.id, ratings.bookingId))
    .where(and(eq(ratings.bookingId, bookingId), eq(bookings.customerUserId, customerUserId)))
    .limit(1);

  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}
