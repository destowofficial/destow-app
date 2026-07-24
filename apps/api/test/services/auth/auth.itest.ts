// Integration tests for the auth/session security invariants. Requires a real
// Postgres (db-test) and Redis - excluded from the default `bun test` by the
// .itest.ts name; run via `bun run test:integration` (which wires the env).
import { test, expect, afterAll, beforeAll } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from '@/db/connection.js';
import { redis } from '@/db/redis.js';
import { env } from '@/config/env.js';
import { users, sessions, refreshTokens } from '@/db/schema.js';
import { AppError } from '@/lib/http/errors.js';
import { createSession, rotateRefresh, revokeSession, isRevoked } from '@/services/auth/session.service.js';
import { requestOtp } from '@/services/auth/auth.service.js';

// Clean slate each run so tests are independent and repeatable. Guarded so this
// can only ever run against the ephemeral test database - never dev/prod.
beforeAll(async () => {
  if (!/destow_test/.test(env.DATABASE_URL)) {
    throw new Error(`Refusing to truncate a non-test database: ${env.DATABASE_URL}`);
  }
  await db.execute(sql`TRUNCATE TABLE auth_events, refresh_tokens, sessions, users RESTART IDENTITY CASCADE`);
});

const ctx = { ip: '10.0.0.1', userAgent: 'itest', deviceName: 'itest', platform: 'web' };

let userSeq = 0;
async function createUser(status: 'active' | 'suspended' | 'banned' = 'active') {
  userSeq += 1;
  const phone = `+91990000${String(userSeq).padStart(4, '0')}`;
  const [u] = await db
    .insert(users)
    .values({ phone, name: 'ITest User', role: 'customer', status })
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
  const s = await createSession({ userId: user.id, role: user.role, ctx });

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
  const s = await createSession({ userId: user.id, role: user.role, ctx });

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
  const s = await createSession({ userId: user.id, role: user.role, ctx });
  await revokeSession(s.sessionId, 'logout', ctx);

  await expectReject(rotateRefresh(s.refreshToken, ctx), 401);

  const toks = await db.select().from(refreshTokens).where(eq(refreshTokens.sessionId, s.sessionId));
  expect(toks.length).toBe(1); // still just the original, no new token issued
});

test('rotation against an expired session 401s', async () => {
  const user = await createUser();
  const s = await createSession({ userId: user.id, role: user.role, ctx });
  await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(sessions.id, s.sessionId));

  await expectReject(rotateRefresh(s.refreshToken, ctx), 401);
});

// --- Ban takes effect at refresh ---------------------------------------------
test('a banned user is rejected at refresh and the session is revoked', async () => {
  const user = await createUser('active');
  const s = await createSession({ userId: user.id, role: user.role, ctx });
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
