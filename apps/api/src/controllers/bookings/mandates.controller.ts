import type { Request, Response } from 'express';
import { setupMandateBody, confirmMandateBody } from '@destow/contracts';
import {
  setupMandate,
  confirmMandate,
  listMyPaymentMethods,
  revokeMandate,
} from '../../services/bookings/mandates.service.js';
import { parseOrThrow, uuidParam } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';

function callerId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}

export async function setupMandateController(req: Request, res: Response) {
  const body = parseOrThrow(setupMandateBody, req.body ?? {});
  ok(res, { setup: await setupMandate(callerId(req), body) }, 201);
}

export async function confirmMandateController(req: Request, res: Response) {
  const body = parseOrThrow(confirmMandateBody, req.body);
  ok(res, { paymentMethod: await confirmMandate(callerId(req), body) });
}

export async function listPaymentMethodsController(req: Request, res: Response) {
  ok(res, { paymentMethods: await listMyPaymentMethods(callerId(req)) });
}

export async function revokeMandateController(req: Request, res: Response) {
  await revokeMandate(callerId(req), uuidParam(req.params.id));
  ok(res, { revoked: true });
}
