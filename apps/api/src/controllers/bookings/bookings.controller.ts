import type { Request, Response } from 'express';
import {
  createBookingBody,
  listBookingsQuery,
  confirmPaymentBody,
  createRatingBody,
} from '@destow/contracts';
import {
  createBooking,
  getMyBooking,
  listMyBookings,
  cancelMyBooking,
  confirmTripDistance,
  previewCancellation,
} from '../../services/bookings/bookings.service.js';
import {
  startPayment,
  confirmPayment,
} from '../../services/bookings/payments.service.js';
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
export async function startPaymentController(req: Request, res: Response) {
  ok(res, { payment: await startPayment(callerId(req), uuidParam(req.params.id)) });
}

export async function confirmPaymentController(req: Request, res: Response) {
  const body = parseOrThrow(confirmPaymentBody, req.body);
  ok(
    res,
    await confirmPayment(
      callerId(req),
      uuidParam(req.params.id),
      { orderId: body.orderId, paymentId: body.paymentId, signature: body.signature },
      body.method,
    ),
  );
}

// --- Rating -------------------------------------------------------------------
export async function rateBookingController(req: Request, res: Response) {
  const body = parseOrThrow(createRatingBody, req.body);
  ok(res, { rating: await rateBooking(callerId(req), uuidParam(req.params.id), body) }, 201);
}

export async function getRatingController(req: Request, res: Response) {
  ok(res, { rating: await getBookingRating(callerId(req), uuidParam(req.params.id)) });
}

// The customer agreeing the odometer. Takes no body: the figure being confirmed
// is the one the partner submitted and the customer was shown, so accepting a
// distance from the client here would let them name their own price.
export async function confirmDistanceController(req: Request, res: Response) {
  ok(res, { booking: await confirmTripDistance(callerId(req), uuidParam(req.params.id)) });
}

// Read-only: what cancelling would cost right now. Separate from the cancel
// endpoint on purpose, so the screen can show the number without the customer
// having committed to anything by asking.
export async function cancellationPreviewController(req: Request, res: Response) {
  ok(res, { cancellation: await previewCancellation(callerId(req), uuidParam(req.params.id)) });
}
