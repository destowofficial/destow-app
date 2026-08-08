import crypto from 'node:crypto';
import { and, eq, gt, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { users, admins, otps } from '../../db/schema.js';
import { redis, observeRedis } from '../../db/redis.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/http/errors.js';
import { safeError } from '../../lib/log/safe.js';
import { verifyPassword } from '../../lib/auth/password.js';
import { recordAuthEvent } from '../../lib/metrics/metrics.js';
import { issueOtp } from '../auth/auth.service.js';
import { createSession, logAuthEvent, type SessionContext } from '../auth/session.service.js';

// Admins clear BOTH factors: a password, then a phone OTP. Either alone mints
// nothing. The plain OTP path already refuses admins (the client/role invariant
// in verifyOtp), so this is the only way an admin session is created.

const CHALLENGE_TTL_SEC = 300; // 5 minutes to enter the code
const MAX_OTP_ATTEMPTS = 5;
const MAX_PASSWORD_ATTEMPTS = 5;
// Backoff for repeated password failures, in minutes.
const LOCKOUT_MINUTES = [1, 5, 30];

const challengeKey = (hash: string) => `2fa:${hash}`;
const attemptsKey = (hash: string) => `2fa:att:${hash}`;

function hashChallenge(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Deliberately identical for unknown email, non-admin, and wrong password.
// Anything more specific tells an attacker which admin emails exist.
function invalidCredentials(): AppError {
  return AppError.unauthorized('Invalid email or password');
}

function lockoutUntil(failedAttempts: number): Date {
  const idx = Math.min(failedAttempts - MAX_PASSWORD_ATTEMPTS, LOCKOUT_MINUTES.length - 1);
  return new Date(Date.now() + LOCKOUT_MINUTES[Math.max(0, idx)] * 60_000);
}

export interface AdminChallenge {
  challengeToken: string;
  phoneHint: string;
  expiresIn: number;
}

// Show enough of the number that an admin recognises which device to check,
// never enough to reconstruct it.
function phoneHint(phone: string): string {
  return `••••${phone.slice(-4)}`;
}

// --- Step 1: password ---------------------------------------------------------
export async function adminPasswordStep(
  email: string,
  password: string,
  ctx: SessionContext = {},
): Promise<AdminChallenge> {
  const [row] = await db
    .select({ user: users, admin: admins })
    .from(users)
    .leftJoin(admins, eq(admins.userId, users.id))
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);

  const admin = row?.admin ?? null;

  if (admin?.lockedUntil && admin.lockedUntil > new Date()) {
    recordAuthEvent('admin_password', 'blocked', 'locked');
    throw AppError.rateLimited('Too many failed attempts - try again later');
  }

  // Always verify, even with no account: an unknown email must cost the same
  // time as a known one, or the response time answers the question for us.
  const passwordOk = await verifyPassword(password, admin?.passwordHash);
  const eligible = row?.user.role === 'admin' && row.user.status === 'active' && admin !== null;

  if (!passwordOk || !eligible) {
    if (admin) {
      const attempts = admin.failedAttempts + 1;
      await db
        .update(admins)
        .set({
          failedAttempts: attempts,
          ...(attempts >= MAX_PASSWORD_ATTEMPTS ? { lockedUntil: lockoutUntil(attempts) } : {}),
        })
        .where(eq(admins.id, admin.id));
    }
    recordAuthEvent('admin_password', 'error', 'invalid');
    throw invalidCredentials();
  }

  await db
    .update(admins)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(admins.id, admin.id));

  // Send the second factor. The admin already proved the password, so the
  // per-phone resend cooldown is skipped - being rate-limited out of your own
  // second factor after a correct password is a lockout, not a defence.
  await issueOtp(row.user.phone);

  const token = crypto.randomBytes(32).toString('base64url');
  const hash = hashChallenge(token);
  await observeRedis('set', () =>
    redis.set(challengeKey(hash), row.user.id, 'EX', CHALLENGE_TTL_SEC),
  );

  await logAuthEvent({ userId: row.user.id, event: 'admin_password_ok', ctx });
  recordAuthEvent('admin_password', 'success');

  return { challengeToken: token, phoneHint: phoneHint(row.user.phone), expiresIn: CHALLENGE_TTL_SEC };
}

// --- Step 2: OTP --------------------------------------------------------------
export async function adminOtpStep(challengeToken: string, code: string, ctx: SessionContext = {}) {
  const hash = hashChallenge(challengeToken);

  let userId: string | null;
  try {
    userId = await observeRedis('get', () => redis.get(challengeKey(hash)));
  } catch (err) {
    console.error(`[auth] admin challenge lookup failed (fail-closed): ${safeError(err)}`);
    throw AppError.serviceUnavailable('Auth temporarily unavailable');
  }
  if (!userId) {
    recordAuthEvent('admin_2fa', 'error', 'challenge_missing');
    throw AppError.unauthorized('Sign-in expired - start again');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.role !== 'admin' || user.status !== 'active') {
    await observeRedis('del', () => redis.del(challengeKey(hash), attemptsKey(hash)));
    throw AppError.unauthorized('Sign-in expired - start again');
  }

  const [otp] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.phone, user.phone), gt(otps.expiresAt, new Date()), isNull(otps.consumedAt)))
    .orderBy(desc(otps.createdAt))
    .limit(1);

  const matched = otp ? await matchesOtp(user.phone, code, otp) : false;

  if (!matched) {
    // A wrong code must NOT burn the challenge, or a single typo forces the
    // whole password step again. Count attempts on a sibling key instead, and
    // only discard the challenge once they are exhausted.
    const attempts = await observeRedis('incr', () => redis.incr(attemptsKey(hash)));
    await observeRedis('expire', () => redis.expire(attemptsKey(hash), CHALLENGE_TTL_SEC));
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await observeRedis('del', () => redis.del(challengeKey(hash), attemptsKey(hash)));
      recordAuthEvent('admin_2fa', 'blocked', 'max_attempts');
      throw AppError.rateLimited('Too many attempts - start again');
    }
    recordAuthEvent('admin_2fa', 'error', 'invalid_code');
    throw AppError.unauthorized('Invalid or expired code');
  }

  await db.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, otp!.id));
  await observeRedis('del', () => redis.del(challengeKey(hash), attemptsKey(hash)));

  const session = await createSession({
    userId: user.id,
    role: user.role,
    client: 'admin_web',
    ctx,
  });
  recordAuthEvent('admin_2fa', 'success');

  return {
    ...session,
    tokenType: 'Bearer' as const,
    expiresIn: env.ACCESS_TOKEN_TTL_SEC,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// Same HMAC + constant-time comparison the customer path uses, and the same
// per-OTP attempt cap, so a stolen challenge cannot be used to grind the code.
async function matchesOtp(
  phone: string,
  code: string,
  otp: typeof otps.$inferSelect,
): Promise<boolean> {
  if (otp.attempts >= MAX_OTP_ATTEMPTS) return false;
  const expected = Buffer.from(otp.codeHash, 'hex');
  const actual = Buffer.from(
    crypto.createHmac('sha256', env.OTP_HMAC_SECRET).update(`${phone}:${code}`).digest('hex'),
    'hex',
  );
  const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!ok) {
    await db
      .update(otps)
      .set({ attempts: sql`${otps.attempts} + 1` })
      .where(eq(otps.id, otp.id));
  }
  return ok;
}
