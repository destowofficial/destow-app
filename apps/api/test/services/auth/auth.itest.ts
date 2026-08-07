// Integration tests for the auth/session security invariants. Requires a real
// Postgres (db-test) and Redis - excluded from the default `bun test` by the
// .itest.ts name; run via `bun run test:integration` (which wires the env).
import { test, expect, afterAll, beforeAll } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { decodeJwt } from 'jose';
import { db, pool } from '@/db/connection.js';
import { redis } from '@/db/redis.js';
import { env } from '@/config/env.js';
import { users, sessions, refreshTokens } from '@/db/schema.js';
import { AppError } from '@/lib/http/errors.js';
import { createSession, rotateRefresh, revokeSession, isRevoked } from '@/services/auth/session.service.js';
import { requestOtp, verifyOtp, issueOtp } from '@/services/auth/auth.service.js';

// Clean slate each run so tests are independent and repeatable. Guarded so this
// can only ever run against the ephemeral test database - never dev/prod.
beforeAll(async () => {
  if (!/destow_test/.test(env.DATABASE_URL)) {
    throw new Error(`Refusing to truncate a non-test database: ${env.DATABASE_URL}`);
  }
  await db.execute(
    sql`TRUNCATE TABLE auth_events, refresh_tokens, sessions, otps, users RESTART IDENTITY CASCADE`,
  );

  // Redis holds rate-limit counters and the revocation denylist, and they
  // outlive the process - a leftover OTP cooldown fails an unrelated test on the
  // next run. Only ever flush a dedicated test database index, never db 0.
  if (!/\/[1-9]\d*$/.test(env.REDIS_URL)) {
    throw new Error(`Refusing to flush a non-test Redis database: ${env.REDIS_URL}`);
  }
  await redis.flushdb();
});

const ctx = { ip: '10.0.0.1', userAgent: 'itest', deviceName: 'itest', platform: 'web' };

let userSeq = 0;
async function createUser(
  status: 'active' | 'suspended' | 'banned' = 'active',
  role: 'customer' | 'provider' | 'admin' = 'customer',
) {
  userSeq += 1;
  const phone = `+91990000${String(userSeq).padStart(4, '0')}`;
  const [u] = await db
    .insert(users)
    .values({ phone, name: 'ITest User', role, status })
    .returning();
  return u;
}

async function expectReject(p: Promise<unknown>, status: number) {
  let err: unknown;
  try {
    await p;
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).status as number).toBe(status);
}

afterAll(async () => {
  await pool.end();
  await redis.quit().catch(() => {});
});

// --- Happy-path rotation ------------------------------------------------------
test('rotation marks old token used, issues a valid new one, bumps last_used_at', async () => {
  const user = await createUser();
  const s = await createSession({ userId: user.id, role: user.role, client: 'customer_app', ctx });

  const rotated = await rotateRefresh(s.refreshToken, ctx);
  expect(rotated.refreshToken).not.toBe(s.refreshToken);

  const toks = await db.select().from(refreshTokens).where(eq(refreshTokens.sessionId, s.sessionId));
  expect(toks.length).toBe(2);
  expect(toks.filter((t) => t.usedAt !== null).length).toBe(1); // the old one
  expect(toks.filter((t) => t.usedAt === null).length).toBe(1); // the new one

  const [sess] = await db.select().from(sessions).where(eq(sessions.id, s.sessionId));
  expect(sess.revokedAt).toBeNull();
  expect(sess.lastUsedAt.getTime()).toBeGreaterThanOrEqual(sess.createdAt.getTime());
});

// --- Reuse race (the invariant that justifies the whole exercise) -------------
test('concurrent rotation with the same token: exactly one wins, session revoked as reuse', async () => {
  const user = await createUser();
  const s = await createSession({ userId: user.id, role: user.role, client: 'customer_app', ctx });

  const results = await Promise.allSettled([
    rotateRefresh(s.refreshToken, ctx),
    rotateRefresh(s.refreshToken, ctx),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
  expect(results.filter((r) => r.status === 'rejected').length).toBe(1);

  const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
  expect((rejected.reason as AppError).status).toBe(401);

  const [sess] = await db.select().from(sessions).where(eq(sessions.id, s.sessionId));
  expect(sess.revokedAt).not.toBeNull();
  expect(sess.revokedReason).toBe('reuse_detected');
});

// --- Revoked / expired sessions reject without minting anything ---------------
test('rotation against a revoked session 401s and mints nothing', async () => {
  const user = await createUser();
  const s = await createSession({ userId: user.id, role: user.role, client: 'customer_app', ctx });
  await revokeSession(s.sessionId, 'logout', ctx);

  await expectReject(rotateRefresh(s.refreshToken, ctx), 401);

  const toks = await db.select().from(refreshTokens).where(eq(refreshTokens.sessionId, s.sessionId));
  expect(toks.length).toBe(1); // still just the original, no new token issued
});

test('rotation against an expired session 401s', async () => {
  const user = await createUser();
  const s = await createSession({ userId: user.id, role: user.role, client: 'customer_app', ctx });
  await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(sessions.id, s.sessionId));

  await expectReject(rotateRefresh(s.refreshToken, ctx), 401);
});

// --- Ban takes effect at refresh ---------------------------------------------
test('a banned user is rejected at refresh and the session is revoked', async () => {
  const user = await createUser('active');
  const s = await createSession({ userId: user.id, role: user.role, client: 'customer_app', ctx });
  await db.update(users).set({ status: 'banned' }).where(eq(users.id, user.id));

  await expectReject(rotateRefresh(s.refreshToken, ctx), 403);

  const [sess] = await db.select().from(sessions).where(eq(sessions.id, s.sessionId));
  expect(sess.revokedAt).not.toBeNull();
  expect(sess.revokedReason).toBe('banned');
});

// --- Fail-closed on Redis (guards #4 against being "fixed" into fail-open) ----
test('isRevoked fails closed (503) when Redis is unreachable', async () => {
  const orig = redis.exists.bind(redis);
  (redis as unknown as { exists: unknown }).exists = () => Promise.reject(new Error('redis down'));
  try {
    await expectReject(isRevoked('any-sid'), 503);
  } finally {
    (redis as unknown as { exists: unknown }).exists = orig;
  }
});

test('requestOtp fails closed (503) when the rate limiter cannot reach Redis', async () => {
  const orig = redis.set.bind(redis);
  (redis as unknown as { set: unknown }).set = () => Promise.reject(new Error('redis down'));
  try {
    await expectReject(requestOtp('9812345678', ctx), 503);
  } finally {
    (redis as unknown as { set: unknown }).set = orig;
  }
});

// --- Client/role invariant at login -------------------------------------------
// issueOtp returns the plaintext code directly, so none of these depend on
// OTP_DEV_ECHO being enabled.

test('an admin cannot sign in through the customer app', async () => {
  const admin = await createUser('active', 'admin');
  const { code } = await issueOtp(admin.phone);
  await expectReject(verifyOtp(admin.phone, code, 'customer_app', ctx), 403);
});

test('an admin cannot sign in through the provider app', async () => {
  const admin = await createUser('active', 'admin');
  const { code } = await issueOtp(admin.phone);
  await expectReject(verifyOtp(admin.phone, code, 'provider_app', ctx), 403);
});

test('a customer is refused by the provider app', async () => {
  const user = await createUser('active', 'customer');
  const { code } = await issueOtp(user.phone);
  await expectReject(verifyOtp(user.phone, code, 'provider_app', ctx), 403);
});

test('a provider is refused by the customer app', async () => {
  const user = await createUser('active', 'provider');
  const { code } = await issueOtp(user.phone);
  await expectReject(verifyOtp(user.phone, code, 'customer_app', ctx), 403);
});

test('an unknown number in the provider app creates no user row', async () => {
  const phone = '+919111000001';
  const { code } = await issueOtp(phone);
  await expectReject(verifyOtp(phone, code, 'provider_app', ctx), 403);
  const rows = await db.select().from(users).where(eq(users.phone, phone));
  expect(rows).toHaveLength(0);
});

test('an unknown number in the customer app creates the user with the given name', async () => {
  const phone = '+919111000002';
  const { code } = await issueOtp(phone);
  const result = await verifyOtp(phone, code, 'customer_app', ctx, { name: 'Asha Rao' });
  expect(result.user.name).toBe('Asha Rao');
  expect(result.user.role).toBe('customer');
});

test('the access token audience is the client that logged in', async () => {
  const phone = '+919111000003';
  const { code } = await issueOtp(phone);
  const result = await verifyOtp(phone, code, 'customer_app', ctx);
  expect(decodeJwt(result.accessToken).aud).toBe('customer_app');
});

// The refresh request never declares its own client; the session does. Otherwise
// a caller could upgrade its token to another app's audience.
test('refresh re-mints with the audience stored on the session', async () => {
  const user = await createUser('active', 'provider');
  const { code } = await issueOtp(user.phone);
  const login = await verifyOtp(user.phone, code, 'provider_app', ctx);
  const rotated = await rotateRefresh(login.refreshToken, ctx);
  expect(decodeJwt(rotated.accessToken).aud).toBe('provider_app');
});

// The leak this whole slice starts from: the published image returned the real
// OTP in the response body. test:integration sets no OTP_DEV_ECHO, so it is off.
test('requestOtp does not echo the code when OTP_DEV_ECHO is off', async () => {
  const result = await requestOtp('+919111000004', ctx);
  expect(result).not.toHaveProperty('devCode');
});
