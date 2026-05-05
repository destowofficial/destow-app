import { createMiddleware } from 'hono/factory';
import { firebaseAuth } from '../config/firebase.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type Variables = {
  userId: string;
  firebaseUid: string;
};

/**
 * Validates the JWT issued by our backend (not Firebase token).
 * Attaches userId and firebaseUid to the context.
 */
export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; firebaseUid: string };

    // Verify user still exists in DB
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    c.set('userId', decoded.userId);
    c.set('firebaseUid', decoded.firebaseUid);
    await next();
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
});
