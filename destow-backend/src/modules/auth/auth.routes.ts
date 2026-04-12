import { Hono } from 'hono';
import { verifyOtpController, googleSsoController } from './auth.controller.js';

export const authRoutes = new Hono();

/**
 * POST /api/v1/auth/verify-otp
 * Body: { firebaseIdToken: string }
 * Verifies Firebase phone OTP token, upserts user, returns our JWT.
 */
authRoutes.post('/verify-otp', verifyOtpController);

/**
 * POST /api/v1/auth/google-sso
 * Body: { firebaseIdToken: string }
 * Verifies Firebase Google token, upserts user, returns our JWT.
 */
authRoutes.post('/google-sso', googleSsoController);
