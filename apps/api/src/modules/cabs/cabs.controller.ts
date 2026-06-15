import type { Context } from 'hono';
import { getAvailableCabs, bookCab, processPayment } from './cabs.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { z } from 'zod';

// ─── Available Cabs ──────────────────────────────────────────────────────────
const availableSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  distanceKm: z.number().positive().optional().default(300),
});

export async function availableCabsController(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = availableSchema.safeParse(body);
    if (!parsed.success) return errorResponse(c, parsed.error.flatten().fieldErrors as unknown as string, 422);

    const { from, to, distanceKm } = parsed.data;
    const cabs = await getAvailableCabs(from, to, distanceKm);
    return successResponse(c, { cabs, count: cabs.length });
  } catch (err) {
    console.error('[cabs/available]', err);
    return errorResponse(c, 'Failed to fetch available cabs', 500);
  }
}

// ─── Book Cab ────────────────────────────────────────────────────────────────
const bookSchema = z.object({
  cabId: z.string().uuid(),
  from: z.string().min(2),
  to: z.string().min(2),
  pickupDatetime: z.string().datetime({ offset: true }),
  distanceKm: z.number().positive(),
  totalFare: z.number().positive(),
  paymentMethod: z.enum(['upi', 'card', 'cash']),
});

export async function bookCabController(c: Context) {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) return errorResponse(c, parsed.error.flatten().fieldErrors as unknown as string, 422);

    const { cabId, from, to, pickupDatetime, distanceKm, totalFare, paymentMethod } = parsed.data;
    const booking = await bookCab(userId, cabId, from, to, pickupDatetime, distanceKm, totalFare, paymentMethod);
    return successResponse(c, { booking }, 201);
  } catch (err) {
    console.error('[cabs/book]', err);
    return errorResponse(c, 'Booking failed', 500);
  }
}

// ─── Payment ──────────────────────────────────────────────────────────────────
const paymentSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(['upi', 'card', 'cash']),
  transactionRef: z.string().optional(),
});

export async function paymentController(c: Context) {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(c, parsed.error.flatten().fieldErrors as unknown as string, 422);

    const { bookingId, method, transactionRef } = parsed.data;
    const booking = await processPayment(userId, bookingId, method, transactionRef);
    return successResponse(c, { booking });
  } catch (err: unknown) {
    console.error('[cabs/payment]', err);
    const message = err instanceof Error ? err.message : 'Payment failed';
    return errorResponse(c, message, 400);
  }
}
