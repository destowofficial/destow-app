import type { Request, Response } from 'express';
import { requestOtpBody, verifyOtpBody, refreshBody } from '@destow/contracts';
import { requestOtp, verifyOtp } from '../../services/auth/auth.service.js';
import {
  rotateRefresh,
  revokeSession,
  revokeAllForUser,
  listSessions,
  type SessionContext,
} from '../../services/auth/session.service.js';
import { parseOrThrow } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';
import { env } from '../../config/env.js';
import {
  enabledChannels,
  defaultChannel,
  isChannelEnabled,
} from '../../lib/adapters/otp/index.js';

// Derive the request context (real client IP via 'trust proxy', UA, device meta)
// attached to sessions and audit events.
function contextOf(req: Request, device?: Partial<SessionContext>): SessionContext {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    deviceId: device?.deviceId,
    deviceName: device?.deviceName,
    platform: device?.platform,
  };
}

// Which channels this deployment offers, so the client renders the right picker
// instead of hardcoding a list that may not match the server.
export async function channelsController(_req: Request, res: Response) {
  ok(res, { channels: enabledChannels, default: defaultChannel });
}

export async function requestOtpController(req: Request, res: Response) {
  const { phone, channel } = parseOrThrow(requestOtpBody, req.body);
  // The contract accepts any known channel; whether it's actually enabled is a
  // per-deployment question, so reject a disabled one before generating a code.
  if (channel !== undefined && !isChannelEnabled(channel)) {
    throw AppError.badRequest(
      `Channel "${channel}" is not available. Enabled: ${enabledChannels.join(', ')}`,
    );
  }
  ok(res, await requestOtp(phone, contextOf(req), channel ?? defaultChannel));
}

export async function verifyOtpController(req: Request, res: Response) {
  const body = parseOrThrow(verifyOtpBody, req.body);
  const ctx = contextOf(req, {
    deviceId: body.deviceId,
    deviceName: body.deviceName,
    platform: body.platform,
  });
  ok(res, await verifyOtp(body.phone, body.code, body.client, ctx, { name: body.name }));
}

export async function refreshController(req: Request, res: Response) {
  const { refreshToken } = parseOrThrow(refreshBody, req.body);
  const pair = await rotateRefresh(refreshToken, contextOf(req));
  ok(res, { ...pair, tokenType: 'Bearer', expiresIn: env.ACCESS_TOKEN_TTL_SEC });
}

export async function logoutController(req: Request, res: Response) {
  if (!req.sessionId) throw AppError.unauthorized();
  await revokeSession(req.sessionId, 'logout', contextOf(req));
  ok(res, { success: true });
}

export async function logoutAllController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  const revoked = await revokeAllForUser(req.userId, 'logout_all', contextOf(req));
  ok(res, { success: true, revoked });
}

export async function sessionsController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  const rows = await listSessions(req.userId);
  ok(res, { sessions: rows, currentSessionId: req.sessionId });
}
