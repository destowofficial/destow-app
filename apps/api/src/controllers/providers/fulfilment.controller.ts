import type { Request, Response } from 'express';
import { assignDriverBody, providerBookingsQuery } from '@destow/contracts';
import {
  listProviderBookings,
  acceptBooking,
  rejectBooking,
  assignDriver,
  startTrip,
  completeTrip,
  getEarnings,
} from '../../services/providers/fulfilment.service.js';
import { parseOrThrow, uuidParam } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';

function callerId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}

export async function listProviderBookingsController(req: Request, res: Response) {
  const { status } = parseOrThrow(providerBookingsQuery, req.query);
  ok(res, { bookings: await listProviderBookings(callerId(req), status) });
}

export async function acceptBookingController(req: Request, res: Response) {
  ok(res, { booking: await acceptBooking(callerId(req), uuidParam(req.params.id)) });
}

export async function rejectBookingController(req: Request, res: Response) {
  ok(res, { booking: await rejectBooking(callerId(req), uuidParam(req.params.id)) });
}

export async function assignDriverController(req: Request, res: Response) {
  const { driverId } = parseOrThrow(assignDriverBody, req.body);
  ok(res, { booking: await assignDriver(callerId(req), uuidParam(req.params.id), driverId) });
}

export async function startTripController(req: Request, res: Response) {
  ok(res, { booking: await startTrip(callerId(req), uuidParam(req.params.id)) });
}

export async function completeTripController(req: Request, res: Response) {
  ok(res, { booking: await completeTrip(callerId(req), uuidParam(req.params.id)) });
}

export async function earningsController(req: Request, res: Response) {
  ok(res, { earnings: await getEarnings(callerId(req)) });
}
