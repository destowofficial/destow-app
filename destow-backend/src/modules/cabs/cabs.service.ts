import { db } from '../../db/connection.js';
import { cabs, cabTypes, bookings } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ─── Available Cabs ──────────────────────────────────────────────────────────

export async function getAvailableCabs(from: string, to: string, distanceKm: number) {
  // Get all active cabs with their cab type details
  const results = await db
    .select({
      cabId: cabs.id,
      agencyName: cabs.agencyName,
      driverName: cabs.driverName,
      cabTypeName: cabTypes.name,
      seats: cabTypes.seats,
      bags: cabTypes.bags,
      imageKey: cabTypes.imageKey,
      pricePerKm: cabTypes.pricePerKm,
    })
    .from(cabs)
    .innerJoin(cabTypes, eq(cabs.cabTypeId, cabTypes.id))
    .where(eq(cabs.isActive, true));

  // Calculate total fare for the given distance
  return results.map((cab: typeof results[number]) => ({
    id: cab.cabId,
    agencyName: cab.agencyName,
    driverName: cab.driverName,
    driverAvailable: !!cab.driverName,
    cabType: {
      name: cab.cabTypeName,
      seats: cab.seats,
      bags: cab.bags,
      imageKey: cab.imageKey,
    },
    pricePerKm: parseFloat(cab.pricePerKm as string),
    totalFare: Math.round(parseFloat(cab.pricePerKm as string) * distanceKm),
    distanceKm,
    from,
    to,
  }));
}

// ─── Book Cab ────────────────────────────────────────────────────────────────

export async function bookCab(
  userId: string,
  cabId: string,
  from: string,
  to: string,
  pickupDatetime: string,
  distanceKm: number,
  totalFare: number,
  paymentMethod: string,
) {
  const [booking] = await db
    .insert(bookings)
    .values({
      userId,
      cabId,
      fromLocation: from,
      toLocation: to,
      pickupDatetime: new Date(pickupDatetime),
      distanceKm: distanceKm.toString(),
      totalFare: totalFare.toString(),
      status: 'pending',
      paymentMethod,
      paymentStatus: 'pending',
    })
    .returning();

  return booking;
}

// ─── Process Payment ─────────────────────────────────────────────────────────

export async function processPayment(
  userId: string,
  bookingId: string,
  method: string,
  transactionRef?: string,
) {
  // Verify the booking belongs to this user
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
    .limit(1);

  if (!booking) throw new Error('Booking not found');
  if (booking.paymentStatus === 'paid') throw new Error('Booking already paid');

  // In production: integrate with Razorpay / Stripe / other payment gateway here
  // For now we mark it as paid directly
  const [updated] = await db
    .update(bookings)
    .set({
      paymentMethod: method,
      paymentStatus: 'paid',
      transactionRef: transactionRef ?? `TXN-${Date.now()}`,
      status: 'confirmed',
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))
    .returning();

  return updated;
}
