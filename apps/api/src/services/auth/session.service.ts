import crypto from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { sessions, refreshTokens, authEvents, users } from '../../db/schema.js';
import { redis, observeRedis } from '../../db/redis.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/http/errors.js';
import { signAccessToken } from '../../lib/auth/jwt.js';
import { recordAuthEvent } from '../../lib/metrics/metrics.js';

// Postgres is the durable source of truth for sessions/refresh tokens; Redis
// holds the short-lived denylist so a revoked session's still-unexpired access
// tokens die immediately instead of lingering until they expire.

export interface SessionContext {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
}

const REFRESH_BYTES = 32;
const dlSidKey = (sid: string) => `dl:sid:${sid}`;

function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_BYTES).toString('base64url');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function logAuthEvent(input: {
  userId?: string | null;
  sessionId?: string | null;
  event: string;
  ctx?: SessionContext;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(authEvents).values({
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      event: input.event,
      ip: input.ctx?.ip,
      userAgent: input.ctx?.userAgent,
      meta: input.meta,
    });
  } catch (err) {
    // Audit is best-effort - never fail an auth operation because logging failed.
    console.error('[auth] failed to write auth_event', err);
  }
}

// --- Denylist (revocation hot path) -------------------------------------------
// TTL = access-token lifetime: after that no token bearing this sid can still be
// unexpired, so the entry is safe to drop. Revocation is per-session (sid): the
// only revocation actions are logout / logout-all / reuse / ban, all of which
// kill the whole session.
async function denySession(sid: string): Promise<void> {
  await observeRedis('set', () => redis.set(dlSidKey(sid), '1', 'EX', env.ACCESS_TOKEN_TTL_SEC));
}

// Fail-closed: if we can't consult the denylist we cannot prove the session is
// still valid, so reject with a clean 503 rather than risk honoring a revoked
// token. A Redis outage degrades auth to unavailable, never to permissive.
export async function isRevoked(sid: string): Promise<boolean> {
  try {
    return (await observeRedis('exists', () => redis.exists(dlSidKey(sid)))) > 0;
  } catch (err) {
    console.error('[auth] denylist check failed (fail-closed):', (err as Error).message);
    recordAuthEvent('denylist_check', 'error', 'redis_unavailable');
    throw AppError.serviceUnavailable('Auth temporarily unavailable');
  }
}

// --- Session lifecycle --------------------------------------------------------
export async function createSession(input: {
  userId: string;
  role: string;
  ctx: SessionContext;
}): Promise<TokenPair & { sessionId: string }> {
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);

  const [session] = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      deviceId: input.ctx.deviceId,
      deviceName: input.ctx.deviceName,
      platform: input.ctx.platform,
      ip: input.ctx.ip,
      userAgent: input.ctx.userAgent,
      expiresAt,
    })
    .returning();

  const refreshToken = generateRefreshToken();
  await db.insert(refreshTokens).values({
    sessionId: session.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  const access = await signAccessToken({
    userId: input.userId,
    sessionId: session.id,
    role: input.role,
  });

  await logAuthEvent({ userId: input.userId, sessionId: session.id, event: 'login', ctx: input.ctx });

  return {
    accessToken: access.token,
    refreshToken,
    accessTokenExpiresAt: access.expiresAt,
    sessionId: session.id,
  };
}

// Rotate a refresh token. New token issued, old marked used. Presenting an
// already-used token => theft => the whole session family is revoked (OWASP).
export async function rotateRefresh(rawToken: string, ctx: SessionContext): Promise<TokenPair> {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(rawToken)))
    .limit(1);
  if (!row) {
    recordAuthEvent('refresh', 'error', 'invalid_token');
    throw AppError.unauthorized('Invalid refresh token');
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.id, row.sessionId)).limit(1);
  if (!session || session.revokedAt) {
    recordAuthEvent('refresh', 'error', 'revoked_session');
    throw AppError.unauthorized('Session is no longer active');
  }
  if (session.expiresAt <= new Date()) {
    recordAuthEvent('refresh', 'error', 'expired_session');
    throw AppError.unauthorized('Session expired');
  }
  if (row.expiresAt <= new Date()) {
    recordAuthEvent('refresh', 'error', 'expired_token');
    throw AppError.unauthorized('Refresh token expired');
  }

  // Re-read role/status from the source of truth so a demotion/ban takes effect
  // at the next refresh (and mint the new access token with the fresh role).
  const [user] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user) throw AppError.unauthorized('User not found');
  if (user.status !== 'active') {
    await revokeSession(session.id, 'banned', ctx);
    recordAuthEvent('refresh', 'blocked', user.status);
    throw AppError.forbidden(`Account ${user.status}`);
  }

  // Atomically claim this token: the conditional UPDATE is the concurrency gate.
  // Only one racer flips used_at from NULL; anyone else (a replay OR a concurrent
  // use of the same token) matches 0 rows -> reuse -> revoke the whole family.
  const claimed = await db
    .update(refreshTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.usedAt)))
    .returning({ id: refreshTokens.id });
  if (claimed.length === 0) {
    await revokeSession(session.id, 'reuse_detected', ctx);
    recordAuthEvent('refresh', 'blocked', 'reuse_detected');
    throw AppError.unauthorized('Refresh token reuse detected - session revoked');
  }

  const refreshToken = generateRefreshToken();
  await db.transaction(async (tx) => {
    await tx
      .insert(refreshTokens)
      .values({ sessionId: session.id, tokenHash: hashToken(refreshToken), expiresAt: session.expiresAt });
    await tx.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, session.id));
  });

  const access = await signAccessToken({ userId: user.id, sessionId: session.id, role: user.role });
  await logAuthEvent({ userId: user.id, sessionId: session.id, event: 'refresh', ctx });
  recordAuthEvent('refresh', 'success');

  return { accessToken: access.token, refreshToken, accessTokenExpiresAt: access.expiresAt };
}

export async function revokeSession(
  sessionId: string,
  reason: 'logout' | 'logout_all' | 'reuse_detected' | 'banned',
  ctx?: SessionContext,
): Promise<void> {
  const [revoked] = await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
    .returning({ userId: sessions.userId });
  await denySession(sessionId);
  if (revoked) {
    await logAuthEvent({ userId: revoked.userId, sessionId, event: reason, ctx });
    recordAuthEvent('session_revoke', 'success', reason);
  } else {
    recordAuthEvent('session_revoke', 'noop', reason);
  }
}

export async function revokeAllForUser(
  userId: string,
  reason: 'logout_all' | 'banned',
  ctx?: SessionContext,
): Promise<number> {
  const rows = await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  await Promise.all(rows.map((r) => denySession(r.id)));
  await logAuthEvent({ userId, event: reason, ctx, meta: { count: rows.length } });
  recordAuthEvent('session_revoke_all', 'success', reason);
  return rows.length;
}

export async function listSessions(userId: string) {
  return db
    .select({
      id: sessions.id,
      deviceName: sessions.deviceName,
      platform: sessions.platform,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      lastUsedAt: sessions.lastUsedAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(sessions.lastUsedAt));
}
