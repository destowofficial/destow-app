import type { Context } from 'hono';
import { requestOtpToken, verifyOtpToken } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export async function requestOtpController(c: Context) {
  try {
    const { phone } = await c.req.json<{ phone: string }>();
    if (!phone) return errorResponse(c, 'phone is required');

    const result = await requestOtpToken(phone);
    return successResponse(c, result);
  } catch (err: unknown) {
    console.error('[auth/request-otp]', err);
    const message = err instanceof Error ? err.message : 'OTP request failed';
    return errorResponse(c, message, 500);
  }
}

export async function verifyOtpController(c: Context) {
  try {
    const { phone, code } = await c.req.json<{ phone: string; code: string }>();
    if (!phone || !code) return errorResponse(c, 'phone and code are required');

    const result = await verifyOtpToken(phone, code);
    return successResponse(c, result);
  } catch (err: unknown) {
    console.error('[auth/verify-otp]', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return errorResponse(c, message, 401);
  }
}
