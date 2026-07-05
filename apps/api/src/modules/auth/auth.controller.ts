import type { Context } from 'hono';
import { z } from 'zod';
import { requestOtp, verifyOtp } from './auth.service.js';
import { successResponse } from '../../utils/response.js';
import { parseJsonBody } from '../../lib/validate.js';

const requestOtpSchema = z.object({ phone: z.string().min(8).max(15) });
const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(15),
  code: z.string().length(6),
});

export async function requestOtpController(c: Context) {
  const { phone } = await parseJsonBody(c, requestOtpSchema);
  return successResponse(c, await requestOtp(phone));
}

export async function verifyOtpController(c: Context) {
  const { phone, code } = await parseJsonBody(c, verifyOtpSchema);
  return successResponse(c, await verifyOtp(phone, code));
}
