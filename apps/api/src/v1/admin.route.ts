import express from 'express';
import {
  adminLoginController,
  adminVerifyController,
  setUserRoleController,
  setAdminPasswordController,
  listProvidersController,
  setProviderStatusController,
  updateOtpSettingsController,
} from '../controllers/admin/admin.controller.js';
import { requireAuth, requireRole, requireClient } from '../middleware/auth/auth.js';
import { rateLimit } from '../middleware/ratelimit/ratelimit.js';

export const adminRouter: express.Router = express.Router();

// Password guessing is the attack this endpoint invites, so it gets a tighter
// per-IP bucket than the OTP routes. The per-account lockout lives in the
// service; this is the coarse backstop in front of it.
const adminLoginLimiter = rateLimit({ keyPrefix: 'admin_login', max: 30, windowSec: 3600 });

// Public: the two sign-in steps. Neither alone mints a session.
adminRouter.post('/login', adminLoginLimiter, adminLoginController);
adminRouter.post('/verify', adminLoginLimiter, adminVerifyController);

// Everything below requires a completed 2FA session. requireClient pins it to
// the console: an admin token can only have aud=admin_web, since adminOtpStep is
// the only place one is minted - so this is defence in depth rather than the
// only check.
adminRouter.use(requireAuth, requireRole('admin'), requireClient('admin_web'));

adminRouter.patch('/users/:id/role', setUserRoleController);
adminRouter.put('/users/:id/password', setAdminPasswordController);
adminRouter.get('/providers', listProvidersController);
adminRouter.patch('/providers/:id/status', setProviderStatusController);
adminRouter.put('/settings/otp', updateOtpSettingsController);
