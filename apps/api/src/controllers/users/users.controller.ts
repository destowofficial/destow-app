import type { Request, Response } from 'express';
import { updateMeBody } from '@destow/contracts';
import { getMe, updateMe } from '../../services/users/users.service.js';
import { parseOrThrow } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';

// The profile is always the caller's own, taken from the verified token - never
// from a path or body parameter, so there is no object to authorize against and
// no way to ask for someone else's.
export async function getMeController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  ok(res, { user: await getMe(req.userId) });
}

export async function updateMeController(req: Request, res: Response) {
  if (!req.userId) throw AppError.unauthorized();
  const patch = parseOrThrow(updateMeBody, req.body);
  ok(res, { user: await updateMe(req.userId, patch) });
}
