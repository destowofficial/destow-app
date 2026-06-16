import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { availableCabsController, bookCabController, paymentController } from './cabs.controller.js';

export const cabsRoutes = new Hono();

cabsRoutes.use('*', authMiddleware);

/**
 * POST /api/v1/cabs/available
 * Body: { from, to, date, time, distanceKm? }
 * Returns list of available cabs with estimated fares.
 */
cabsRoutes.post('/available', availableCabsController);

/**
 * POST /api/v1/cabs/book
 * Body: { cabId, from, to, pickupDatetime, distanceKm, totalFare, paymentMethod }
 * Creates a booking with status=pending.
 */
cabsRoutes.post('/book', bookCabController);

/**
 * POST /api/v1/cabs/payment
 * Body: { bookingId, method, transactionRef? }
 * Processes payment and confirms the booking.
 */
cabsRoutes.post('/payment', paymentController);
