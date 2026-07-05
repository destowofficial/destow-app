import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import type { UserRole } from '@destow/contracts';

// Verifies the Bearer JWT, confirms the user still exists, and attaches it to req.
// (Express 5 forwards a thrown/rejected error to the error handler.)
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }
  const token = header.slice(7);

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);
  if (!user) throw AppError.unauthorized('User not found');

  req.userId = user.id;
  req.user = user;
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
