import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@destow/contracts';
import { AppError } from '../../lib/http/errors.js';
import { verifyAccessToken } from '../../lib/auth/jwt.js';
import { isRevoked } from '../../services/auth/session.service.js';

// Hot path: verify the EdDSA access token (signature + expiry + iss/aud), then
// one O(1) Redis check for revocation. No Postgres hit - the role travels in the
// token and is re-minted fresh on every refresh. (Express 5 forwards a
// thrown/rejected error to the error handler.)
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }
  const token = header.slice(7);

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }

  if (await isRevoked(claims.sid)) {
    throw AppError.unauthorized('Session has been revoked');
  }

  req.userId = claims.sub;
  req.sessionId = claims.sid;
  req.user = { id: claims.sub, role: claims.role as UserRole };
  next();
}

// Role gate - use after requireAuth: router.use(requireAuth, requireRole('admin')).
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden('Insufficient permissions');
    }
    next();
  };
}
