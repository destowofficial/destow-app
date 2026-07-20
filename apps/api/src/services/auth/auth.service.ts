import crypto from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { users, otps } from '../../db/schema.js';
import { redis, incrWithTtl, observeRedis } from '../../db/redis.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/http/errors.js';
import { sms } from '../../lib/adapters/sms.js';
import { recordAuthEvent, recordRateLimitEvent } from '../../lib/metrics/metrics.js';
import {
  createSession,
  logAuthEvent,
  type SessionContext,
  type TokenPair,
} from './session.service.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const PER_IP_HOURLY_MULTIPLIER = 10; // an IP may cover several phones (shared NAT)

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

// Redis-backed throttle: a resend cooldown + hourly caps per phone and per IP.
// Fail-closed on a Redis outage: without the counters we can't bound OTP abuse,
// so reject with 503 rather than allow unlimited sends. Genuine limit hits are
// AppErrors and propagate unchanged.
async function enforceOtpRateLimits(phone: string, ip?: string): Promise<void> {
  try {
    const cooled = await observeRedis('set', () =>
      redis.set(`otp:cd:${phone}`, '1', 'EX', env.OTP_RESEND_COOLDOWN_SEC, 'NX'),
    );
    if (cooled === null) {
      recordAuthEvent('otp_request', 'blocked', 'cooldown');
      recordRateLimitEvent('otp_phone_cooldown', 'blocked');
      throw AppError.rateLimited('Please wait before requesting another OTP');
    }
    const perPhone = await incrWithTtl(`otp:ph:${phone}`, 3600);
    if (perPhone > env.OTP_MAX_PER_HOUR) {
      recordAuthEvent('otp_request', 'blocked', 'phone_hourly_limit');
      recordRateLimitEvent('otp_phone_hourly', 'blocked');
      throw AppError.rateLimited('Too many OTP requests for this number - try again later');
    }
    recordRateLimitEvent('otp_phone_hourly', 'allowed');
    if (ip) {
      const perIp = await incrWithTtl(`otp:ip:${ip}`, 3600);
      if (perIp > env.OTP_MAX_PER_HOUR * PER_IP_HOURLY_MULTIPLIER) {
        recordAuthEvent('otp_request', 'blocked', 'ip_hourly_limit');
        recordRateLimitEvent('otp_ip_hourly', 'blocked');
        throw AppError.rateLimited('Too many OTP requests - try again later');
      }
      recordRateLimitEvent('otp_ip_hourly', 'allowed');
    }
  } catch (err) {
    if (err instanceof AppError) throw err; // genuine limit hit
    console.error('[auth] OTP rate-limit check failed (fail-closed):', (err as Error).message);
    recordAuthEvent('otp_request', 'error', 'redis_unavailable');
    throw AppError.serviceUnavailable('Auth temporarily unavailable');
  }
}

// Undo the cooldown + counters when the OTP could not actually be delivered, so
// a transient SMS failure never costs the user a wait or an hourly attempt.
async function releaseOtpRateLimits(phone: string, ip?: string): Promise<void> {
  try {
    await Promise.all([
      observeRedis('del', () => redis.del(`otp:cd:${phone}`)),
      observeRedis('decr', () => redis.decr(`otp:ph:${phone}`)),
      ...(ip ? [observeRedis('decr', () => redis.decr(`otp:ip:${ip}`))] : []),
    ]);
  } catch (err) {
    console.error('[auth] failed to release OTP rate limits:', (err as Error).message);
  }
}

export async function requestOtp(rawPhone: string, ctx: SessionContext = {}) {
  const phone = normalizePhone(rawPhone);
  await enforceOtpRateLimits(phone, ctx.ip);

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
    await releaseOtpRateLimits(phone, ctx.ip); // don't penalize a delivery failure
    recordAuthEvent('otp_request', 'error', 'sms_failed');
    throw new AppError(502, 'internal', 'Failed to send OTP SMS');
  }

  await logAuthEvent({ event: 'otp_requested', ctx, meta: { phone } });
  recordAuthEvent('otp_request', 'success');

  return {
    success: true,
    message: 'OTP sent',
    ...(env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}

export interface VerifyOtpResult extends TokenPair {
  tokenType: 'Bearer';
  expiresIn: number;
  user: { id: string; name: string; phone: string; avatarUrl: string | null; role: string };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
  ctx: SessionContext = {},
): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);

  const [otp] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.phone, phone), gt(otps.expiresAt, new Date()), isNull(otps.consumedAt)))
    .orderBy(desc(otps.createdAt))
    .limit(1);

  if (!otp) {
    recordAuthEvent('otp_verify', 'error', 'missing_or_expired');
    throw AppError.unauthorized('Invalid or expired OTP');
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    recordAuthEvent('otp_verify', 'blocked', 'max_attempts');
    throw AppError.rateLimited('Too many attempts - request a new OTP');
  }

  const expected = Buffer.from(otp.codeHash, 'hex');
  const actual = Buffer.from(hashOtp(phone, code), 'hex');
  const okMatch = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!okMatch) {
    // Atomic increment (DB computes) so concurrent wrong guesses can't lose updates.
    await db
      .update(otps)
      .set({ attempts: sql`${otps.attempts} + 1` })
      .where(eq(otps.id, otp.id));
    recordAuthEvent('otp_verify', 'error', 'invalid_code');
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
  if (user.status !== 'active') {
    recordAuthEvent('login', 'blocked', user.status);
    throw AppError.forbidden(`Account ${user.status}`);
  }

  const { accessToken, refreshToken, accessTokenExpiresAt } = await createSession({
    userId: user.id,
    role: user.role,
    ctx,
  });
  recordAuthEvent('login', 'success');

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    tokenType: 'Bearer',
    expiresIn: env.ACCESS_TOKEN_TTL_SEC,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  };
}
