import type { Request, Response } from 'express';
import {
  adminLoginBody,
  adminVerifyBody,
  setUserRoleBody,
  setProviderStatusBody,
  setVehicleStatusBody,
  VEHICLE_STATUS,
  type VehicleStatus,
  setAdminPasswordBody,
  otpSettingsBody,
  PROVIDER_STATUS,
  type ProviderStatus,
} from '@destow/contracts';
import { adminPasswordStep, adminOtpStep } from '../../services/admin/admin-auth.service.js';
import {
  setUserRole,
  setProviderStatus,
  listProviders,
  listVehiclesForReview,
  setVehicleStatus,
  setAdminPassword,
  updateOtpSettings,
} from '../../services/admin/admin.service.js';
import { parseOrThrow, uuidParam } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';
import type { SessionContext } from '../../services/auth/session.service.js';

function contextOf(req: Request): SessionContext {
  return { ip: req.ip, userAgent: req.headers['user-agent'], platform: 'web' };
}

// --- Two-factor sign-in -------------------------------------------------------
export async function adminLoginController(req: Request, res: Response) {
  const { email, password } = parseOrThrow(adminLoginBody, req.body);
  ok(res, await adminPasswordStep(email, password, contextOf(req)));
}

export async function adminVerifyController(req: Request, res: Response) {
  const { challengeToken, code } = parseOrThrow(adminVerifyBody, req.body);
  ok(res, await adminOtpStep(challengeToken, code, contextOf(req)));
}

// --- Control plane ------------------------------------------------------------
export async function setUserRoleController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  const { role } = parseOrThrow(setUserRoleBody, req.body);
  ok(res, { user: await setUserRole(req.userId, uuidParam(req.params.id), role, contextOf(req)) });
}

export async function setAdminPasswordController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  const { password } = parseOrThrow(setAdminPasswordBody, req.body);
  await setAdminPassword(uuidParam(req.params.id), password, req.userId, contextOf(req));
  ok(res, { success: true });
}

export async function listProvidersController(req: Request, res: Response) {
  const raw = req.query.status;
  // An unknown ?status would otherwise silently return every provider, which
  // reads as "none are pending" - the opposite of the truth.
  if (raw !== undefined && !(PROVIDER_STATUS as readonly string[]).includes(String(raw))) {
    throw AppError.badRequest(`status must be one of: ${PROVIDER_STATUS.join(', ')}`);
  }
  ok(res, { providers: await listProviders(raw as ProviderStatus | undefined) });
}

export async function setProviderStatusController(req: Request, res: Response) {
  const { status } = parseOrThrow(setProviderStatusBody, req.body);
  ok(res, { provider: await setProviderStatus(uuidParam(req.params.id), status) });
}

export async function updateOtpSettingsController(req: Request, res: Response) {
  const body = parseOrThrow(otpSettingsBody, req.body);
  ok(res, { settings: await updateOtpSettings(body) });
}

export async function listVehiclesForReviewController(req: Request, res: Response) {
  const raw = req.query.status;
  if (raw !== undefined && !(VEHICLE_STATUS as readonly string[]).includes(String(raw))) {
    throw AppError.badRequest(`status must be one of: ${VEHICLE_STATUS.join(', ')}`);
  }
  ok(res, { vehicles: await listVehiclesForReview(raw as VehicleStatus | undefined) });
}

export async function setVehicleStatusController(req: Request, res: Response) {
  const { status } = parseOrThrow(setVehicleStatusBody, req.body);
  ok(res, { vehicle: await setVehicleStatus(uuidParam(req.params.id), status) });
}
