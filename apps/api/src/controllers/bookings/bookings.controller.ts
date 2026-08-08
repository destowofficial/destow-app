import type { Request, Response } from 'express';
import { createBookingBody, listBookingsQuery, confirmPaymentBody } from '@destow/contracts';
import {
  createBooking,
  getMyBooking,
  listMyBookings,
  cancelMyBooking,
} from '../../services/bookings/bookings.service.js';
import {
  startPayment,
  confirmPayment,
} from '../../services/bookings/payments.service.js';
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
