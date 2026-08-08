import type { Request, Response } from 'express';
import { handlePaymentWebhook } from '../../services/bookings/payments.service.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';

// Called by the payment gateway, not by a user. There is no session here - the
// signature over the raw body is the authentication.
export async function paymentWebhookController(req: Request, res: Response) {
  const raw = (req as Request & { rawBody?: string }).rawBody;
  if (!raw) throw AppError.badRequest('Missing request body');

  const signature =
    req.header('x-razorpay-signature') ?? req.header('x-destow-signature') ?? '';

  ok(res, await handlePaymentWebhook(raw, signature));
}
