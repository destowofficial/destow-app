import type { Request, Response } from 'express';
import { registerProviderBody } from '@destow/contracts';
import { registerProvider, getMyProvider } from '../../services/providers/providers.service.js';
import { parseOrThrow } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';
import type { SessionContext } from '../../services/auth/session.service.js';

function contextOf(req: Request): SessionContext {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

// Registration is always for the caller's own account, taken from the token -
// nobody can register a provider on someone else's behalf.
export async function registerProviderController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  const body = parseOrThrow(registerProviderBody, req.body);
  const provider = await registerProvider(req.userId, body, contextOf(req));
  // 201: this created a partner. The caller's sessions are now revoked, so the
  // response says so rather than leaving the client to discover it on the next
  // 401 and treat a successful registration as a failure.
  ok(
    res,
    {
      provider,
      reauthRequired: true,
      message: 'Provider profile created. Sign in again through the partner app.',
    },
    201,
  );
}

export async function getMyProviderController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  ok(res, { provider: await getMyProvider(req.userId) });
}
