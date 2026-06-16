import type { Context } from 'hono';
import { z } from 'zod';
import { getAvailableCabs, bookCab, processPayment } from './cabs.service.js';
import { successResponse } from '../../utils/response.js';
import { parseJsonBody } from '../../lib/validate.js';

const availableSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().optional(),
  time: z.string().optional(),
  distanceKm: z.number().positive().default(300),
});

export async function availableCabsController(c: Context) {
  const { from, to, distanceKm } = await parseJsonBody(c, availableSchema);
  const cabs = await getAvailableCabs(from, to, distanceKm);
  return successResponse(c, { cabs, count: cabs.length });
}

const bookSchema = z.object({
  cabId: z.string().uuid(),
  from: z.string().min(2),
  to: z.string().min(2),
  pickupDatetime: z.string(),
  distanceKm: z.number().positive(),
  totalFare: z.number().optional(), // accepted but IGNORED — fare is server-computed
  paymentMethod: z.enum(['upi', 'card', 'cash']),
});

export async function bookCabController(c: Context) {
  const userId = c.get('userId') as string;
  const { cabId, from, to, pickupDatetime, distanceKm, paymentMethod } = await parseJsonBody(
    c,
    bookSchema,
  );
  const booking = await bookCab({ userId, cabId, from, to, pickupDatetime, distanceKm, paymentMethod });
  return successResponse(c, { booking }, 201);
}

const paymentSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(['upi', 'card', 'cash']),
  transactionRef: z.string().optional(),
});

export async function paymentController(c: Context) {
  const userId = c.get('userId') as string;
  const { bookingId, method, transactionRef } = await parseJsonBody(c, paymentSchema);
  const booking = await processPayment(userId, bookingId, method, transactionRef);
  return successResponse(c, { booking });
}
