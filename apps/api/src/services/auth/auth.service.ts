import crypto from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { users, otps } from '../../db/schema.js';
import { redis, incrWithTtl, observeRedis } from '../../db/redis.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/http/errors.js';
import { sms } from '../../lib/adapters/sms.js';
import { canonicalizePhone } from '../../lib/auth/phone.js';
import { CLIENT_ROLE, type OtpClient } from '@destow/contracts';
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

// OTPs are stored hashed (HMAC-SHA256), never plaintext, under a key used for
// nothing else.
function hashOtp(phone: string, code: string): string {
  return crypto.createHmac('sha256', env.OTP_HMAC_SECRET).update(`${phone}:${code}`).digest('hex');
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

// Hashing, storage and delivery for one OTP. Extracted so the admin password
// step (Part 3) can send an OTP without duplicating any of it. Callers own their
// own rate limiting - this function applies none. Expects a canonical phone.
export async function issueOtp(phone: string): Promise<string> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // One active OTP per phone.
  await db.delete(otps).where(eq(otps.phone, phone));
  await db.insert(otps).values({ phone, codeHash: hashOtp(phone, code), expiresAt });

  // Delivery goes through the SmsProvider adapter (SNS in prod, dev-log locally).
  await sms.sendOtp(phone, code);
  return code;
}

export async function requestOtp(rawPhone: string, ctx: SessionContext = {}) {
  // Canonicalize before the rate limiter so the Redis keys are keyed on the
  // canonical number - otherwise two spellings get two independent quotas.
  const phone = canonicalizePhone(rawPhone);
  await enforceOtpRateLimits(phone, ctx.ip);

  let code: string;
  try {
    code = await issueOtp(phone);
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
    // Gated on its own flag, not NODE_ENV. parseEnv() refuses to boot with this
    // enabled in production, so the code cannot leak by misconfiguration.
    ...(env.OTP_DEV_ECHO ? { devCode: code } : {}),
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
  client: OtpClient,
  ctx: SessionContext = {},
  profile: { name?: string } = {},
): Promise<VerifyOtpResult> {
  const phone = canonicalizePhone(rawPhone);

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
    // Only the customer app creates an account from a bare OTP. Providers are
    // made by an admin assigning the role, so an unknown number in the partner
    // app is a genuine "not a partner yet" - never a silent signup into an
    // empty account the person can do nothing with.
    if (client !== 'customer_app') {
      recordAuthEvent('login', 'blocked', 'unknown_provider');
      throw AppError.forbidden('This number is not registered as a Destow partner');
    }
    [user] = await db
      .insert(users)
      .values({
        phone,
        name: profile.name?.trim() || 'Destow User',
        authProvider: 'phone',
      })
      .returning();
  }

  if (user.status !== 'active') {
    recordAuthEvent('login', 'blocked', user.status);
    throw AppError.forbidden(`Account ${user.status}`);
  }

  // The invariant. One rule replaces the admin special case and covers every
  // pair: a customer in the partner app, a provider in the customer app, and an
  // admin in either - admins must clear password + OTP instead.
  //
  // The OTP was consumed above, so a rejection here burns the code. That is
  // correct, and it is also why the distinct messages are safe: an attacker can
  // only probe numbers whose SMS they already receive.
  if (user.role !== CLIENT_ROLE[client]) {
    recordAuthEvent('login', 'blocked', `role_client_mismatch:${user.role}`);
    throw AppError.forbidden(
      user.role === 'admin'
        ? 'Admins must sign in through the admin console'
        : 'This number is not registered for this app',
    );
  }

  const { accessToken, refreshToken, accessTokenExpiresAt } = await createSession({
    userId: user.id,
    role: user.role,
    client,
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
