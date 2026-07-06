import type { Request, Response } from 'express';
import { z } from 'zod';
import { requestOtp, verifyOtp } from './auth.service.js';
import { parseOrThrow } from '../../lib/validate.js';
import { ok } from '../../lib/response.js';

const requestOtpSchema = z.object({ phone: z.string().min(8).max(15) });
const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(15),
  code: z.string().length(6),
});

export async function requestOtpController(req: Request, res: Response) {
  const { phone } = parseOrThrow(requestOtpSchema, req.body);
  ok(res, await requestOtp(phone));
}

export async function verifyOtpController(req: Request, res: Response) {
  const { phone, code } = parseOrThrow(verifyOtpSchema, req.body);
  ok(res, await verifyOtp(phone, code));
}
