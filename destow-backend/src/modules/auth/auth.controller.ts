import type { Context } from 'hono';
import { verifyOtpToken, verifyGoogleToken } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export async function verifyOtpController(c: Context) {
  try {
    const { firebaseIdToken } = await c.req.json<{ firebaseIdToken: string }>();
    if (!firebaseIdToken) return errorResponse(c, 'firebaseIdToken is required');

    const result = await verifyOtpToken(firebaseIdToken);
    return successResponse(c, result);
  } catch (err: unknown) {
    console.error('[auth/verify-otp]', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return errorResponse(c, message, 401);
  }
}

export async function googleSsoController(c: Context) {
  try {
    const { firebaseIdToken } = await c.req.json<{ firebaseIdToken: string }>();
    if (!firebaseIdToken) return errorResponse(c, 'firebaseIdToken is required');

    const result = await verifyGoogleToken(firebaseIdToken);
    return successResponse(c, result);
  } catch (err: unknown) {
    console.error('[auth/google-sso]', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return errorResponse(c, message, 401);
  }
}
