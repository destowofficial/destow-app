import express from 'express';
import {
  requestOtpController,
  verifyOtpController,
  refreshController,
  logoutController,
  logoutAllController,
  sessionsController,
} from '../controllers/auth/auth.controller.js';
import { requireAuth } from '../middleware/auth/auth.js';
import { rateLimit } from '../middleware/ratelimit/ratelimit.js';

export const authRouter: express.Router = express.Router();

// Coarse per-IP backstops with separate buckets per endpoint. The auth service
// owns the meaningful OTP limits (per-phone cooldown/hourly + per-IP), so these
// sit ABOVE the service's per-IP cap (OTP_MAX_PER_HOUR * 10 = 50) and only catch
// gross abuse - they must not be the binding constraint on a shared NAT.
const otpRequestLimiter = rateLimit({ keyPrefix: 'otp_req', max: 60, windowSec: 3600 });
const otpVerifyLimiter = rateLimit({ keyPrefix: 'otp_verify', max: 60, windowSec: 3600 });
const authLimiter = rateLimit({ keyPrefix: 'auth', max: 120, windowSec: 3600 });

authRouter.post('/request-otp', otpRequestLimiter, requestOtpController);
authRouter.post('/verify-otp', otpVerifyLimiter, verifyOtpController);
authRouter.post('/refresh', authLimiter, refreshController);
authRouter.post('/logout', requireAuth, logoutController);
authRouter.post('/logout-all', requireAuth, logoutAllController);
authRouter.get('/sessions', requireAuth, sessionsController);
