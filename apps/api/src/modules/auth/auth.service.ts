import crypto from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '../../db/connection.js';
import { users, otps } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { sms } from '../../lib/sms.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

function normalizePhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
}

// OTPs are stored hashed (HMAC-SHA256), never plaintext.
function hashOtp(phone: string, code: string): string {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
}

function generateOtpCode(): string {
  return crypto.randomInt(100_000, 1_000_000).toString(); // crypto RNG, 6 digits
}

function signJwt(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // One active OTP per phone.
  await db.delete(otps).where(eq(otps.phone, phone));
  await db.insert(otps).values({ phone, codeHash: hashOtp(phone, code), expiresAt });

  // Delivery goes through the SmsProvider adapter (SNS in prod, dev-log locally).
  try {
    await sms.sendOtp(phone, code);
  } catch (err) {
    console.error('[auth] SMS send failed', err);
    throw new AppError(502, 'internal', 'Failed to send OTP SMS');
  }

  return {
    success: true,
    message: 'OTP sent',
    ...(env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}

export async function verifyOtp(rawPhone: string, code: string) {
  const phone = normalizePhone(rawPhone);

  const [otp] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.phone, phone), gt(otps.expiresAt, new Date()), isNull(otps.consumedAt)))
    .orderBy(desc(otps.createdAt))
    .limit(1);

  if (!otp) throw AppError.unauthorized('Invalid or expired OTP');
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw AppError.rateLimited('Too many attempts - request a new OTP');
  }

  const expected = Buffer.from(otp.codeHash, 'hex');
  const actual = Buffer.from(hashOtp(phone, code), 'hex');
  const okMatch = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!okMatch) {
    await db.update(otps).set({ attempts: otp.attempts + 1 }).where(eq(otps.id, otp.id));
    throw AppError.unauthorized('Invalid or expired OTP');
  }

  await db.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, otp.id));

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ phone, name: 'Destow User', authProvider: 'phone' })
      .returning();
  }

  return {
    token: signJwt(user.id),
    user: { id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role },
  };
}
