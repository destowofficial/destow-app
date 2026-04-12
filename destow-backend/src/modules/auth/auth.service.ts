import { firebaseAuth } from '../../config/firebase.js';
import { db } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

function signJwt(userId: string, firebaseUid: string) {
  return jwt.sign({ userId, firebaseUid }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

// ─── Phone OTP Auth ─────────────────────────────────────────────────────────

/**
 * Verifies a Firebase ID token obtained after OTP login on the mobile app.
 * Upserts the user in our DB, returns our JWT.
 */
export async function verifyOtpToken(firebaseIdToken: string) {
  const decoded = await firebaseAuth.verifyIdToken(firebaseIdToken);

  if (!decoded.phone_number) {
    throw new Error('No phone number associated with this Firebase token');
  }

  // Upsert user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  let user = existing[0];

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        firebaseUid: decoded.uid,
        name: decoded.name ?? 'Destow User',
        phone: decoded.phone_number,
        authProvider: 'phone',
      })
      .returning();
    user = created;
  }

  const token = signJwt(user.id, user.firebaseUid);
  return { token, user: { id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl } };
}

// ─── Google SSO ──────────────────────────────────────────────────────────────

/**
 * Verifies a Firebase ID token obtained after Google Sign-In on the mobile app.
 */
export async function verifyGoogleToken(firebaseIdToken: string) {
  const decoded = await firebaseAuth.verifyIdToken(firebaseIdToken);

  if (!decoded.email) {
    throw new Error('No email associated with this Google account');
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  let user = existing[0];

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        firebaseUid: decoded.uid,
        name: decoded.name ?? decoded.email.split('@')[0],
        email: decoded.email,
        avatarUrl: decoded.picture,
        authProvider: 'google',
      })
      .returning();
    user = created;
  }

  const token = signJwt(user.id, user.firebaseUid);
  return { token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } };
}
