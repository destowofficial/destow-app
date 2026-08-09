import type { Request, Response } from 'express';
import {
  createBookingBody,
  listBookingsQuery,
  createRatingBody,
} from '@destow/contracts';
import {
  createBooking,
  getMyBooking,
  listMyBookings,
  cancelMyBooking,
  previewCancellation,
} from '../../services/bookings/bookings.service.js';
import { startQrPayment, paymentStatus } from '../../services/bookings/payments.service.js';
import { rateBooking, getBookingRating } from '../../services/bookings/ratings.service.js';
import { parseOrThrow, uuidParam } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';

function callerId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}

export async function createBookingController(req: Request, res: Response) {
  const body = parseOrThrow(createBookingBody, req.body);
  ok(res, { booking: await createBooking(callerId(req), body) }, 201);
}

export async function listBookingsController(req: Request, res: Response) {
  const query = parseOrThrow(listBookingsQuery, req.query);
  ok(res, await listMyBookings(callerId(req), query));
}

export async function getBookingController(req: Request, res: Response) {
  ok(res, { booking: await getMyBooking(callerId(req), uuidParam(req.params.id)) });
}

export async function cancelBookingController(req: Request, res: Response) {
  ok(res, { booking: await cancelMyBooking(callerId(req), uuidParam(req.params.id)) });
}

// --- Payment ------------------------------------------------------------------
export async function startQrPaymentController(req: Request, res: Response) {
  ok(res, { payment: await startQrPayment(callerId(req), uuidParam(req.params.id)) });
}

// Polled by the QR screen while the customer is paying. Kept separate from the
// booking read so it stays cheap enough to call every couple of seconds.
export async function paymentStatusController(req: Request, res: Response) {
  ok(res, { payment: await paymentStatus(callerId(req), uuidParam(req.params.id)) });
}


// --- Rating -------------------------------------------------------------------
export async function rateBookingController(req: Request, res: Response) {
  const body = parseOrThrow(createRatingBody, req.body);
  ok(res, { rating: await rateBooking(callerId(req), uuidParam(req.params.id), body) }, 201);
}

export async function getRatingController(req: Request, res: Response) {
  ok(res, { rating: await getBookingRating(callerId(req), uuidParam(req.params.id)) });
}


// Read-only: what cancelling would cost right now. Separate from the cancel
// endpoint on purpose, so the screen can show the number without the customer
// having committed to anything by asking.
export async function cancellationPreviewController(req: Request, res: Response) {
  ok(res, { cancellation: await previewCancellation(callerId(req), uuidParam(req.params.id)) });
}
