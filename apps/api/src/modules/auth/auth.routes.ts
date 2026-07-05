import { Hono } from 'hono';
import { requestOtpController, verifyOtpController } from './auth.controller.js';

export const authRoutes = new Hono();

/**
 * POST /api/v1/auth/request-otp
 * Body: { phone: string }
 * Generates OTP and sends via AWS SNS.
 */
authRoutes.post('/request-otp', requestOtpController);

/**
 * POST /api/v1/auth/verify-otp
 * Body: { phone: string, code: string }
 * Verifies custom OTP token, upserts user, returns our JWT.
 */
authRoutes.post('/verify-otp', verifyOtpController);
