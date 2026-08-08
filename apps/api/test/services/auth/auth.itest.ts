// Integration tests for the auth/session security invariants. Requires a real
// Postgres (db-test) and Redis - excluded from the default `bun test` by the
// .itest.ts name; run via `bun run test:integration` (which wires the env).
import { test, expect, afterAll, afterEach, beforeAll } from 'bun:test';
import { eq, sql, and, notInArray } from 'drizzle-orm';
import { decodeJwt } from 'jose';
import { db, pool } from '@/db/connection.js';
import { redis } from '@/db/redis.js';
import { env } from '@/config/env.js';
import {
  users, sessions, refreshTokens, platformSettings, customers, admins,
  vehicles, vehicleTypes, bookings,
} from '@/db/schema.js';
import { AppError } from '@/lib/http/errors.js';
import { createSession, rotateRefresh, revokeSession, isRevoked } from '@/services/auth/session.service.js';
import { requestOtp, verifyOtp, issueOtp } from '@/services/auth/auth.service.js';
import { getOtpSettings, invalidateOtpSettings } from '@/services/settings/otp-settings.service.js';
import { getMe, updateMe } from '@/services/users/users.service.js';
import { registerProvider, getMyProvider } from '@/services/providers/providers.service.js';
import { adminPasswordStep, adminOtpStep } from '@/services/admin/admin-auth.service.js';
import {
  setUserRole,
  setProviderStatus,
  setAdminPassword,
  updateOtpSettings,
  setVehicleStatus,
} from '@/services/admin/admin.service.js';
import { searchRoute, listAvailableVehicles } from '@/services/search/search.service.js';
import {
  createBooking,
  getMyBooking,
  listMyBookings,
  cancelMyBooking,
} from '@/services/bookings/bookings.service.js';
import {
  listProviderBookings,
  acceptBooking,
  assignDriver,
  startTrip,
  completeTrip,
  getEarnings,
} from '@/services/providers/fulfilment.service.js';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  createDriver,
  updateDriver,
} from '@/services/providers/fleet.service.js';

// Clean slate each run so tests are independent and repeatable. Guarded so this
// can only ever run against the ephemeral test database - never dev/prod.
beforeAll(async () => {
  if (!/destow_test/.test(env.DATABASE_URL)) {
    throw new Error(`Refusing to truncate a non-test database: ${env.DATABASE_URL}`);
  }
  await db.execute(
    sql`TRUNCATE TABLE auth_events, refresh_tokens, sessions, otps, customers, admins, bookings, vehicles, vehicle_types, drivers, service_providers, users RESTART IDENTITY CASCADE`,
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

// platform_settings is global mutable state and the OTP-channel tests rewrite
// it. Restore the default after every test, so test ordering never decides
// whether a later test can send an OTP. With no row, getOtpSettings falls back
// to the env-configured channels.
afterEach(async () => {
  await db.delete(platformSettings);
  invalidateOtpSettings();
});

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

// --- Admin-selectable OTP channel ---------------------------------------------
// The point of moving selection into platform_settings: an admin changes the row
// and the next delivery uses the new provider, with no redeploy.

test('delivery settings come from platform_settings, not the environment', async () => {
  await db.delete(platformSettings);
  await db.insert(platformSettings).values({
    otpChannels: ['log'],
    otpDefaultChannel: 'log',
  });
  invalidateOtpSettings();

  const settings = await getOtpSettings();
  expect(settings.channels).toEqual(['log']);
  expect(settings.defaultChannel).toBe('log');
});

// A channel the admin switched on whose credentials are absent must not become
// a provider that accepts a send and never delivers - it drops out instead.
test('a channel without credentials is dropped even when the admin enabled it', async () => {
  await db.delete(platformSettings);
  await db.insert(platformSettings).values({
    otpChannels: ['whatsapp', 'log'],
    otpDefaultChannel: 'whatsapp',
  });
  invalidateOtpSettings();

  // The integration env configures no WhatsApp credentials, so only 'log' survives
  // and the unusable default falls through to it.
  const settings = await getOtpSettings();
  expect(settings.channels).toEqual(['log']);
  expect(settings.defaultChannel).toBe('log');

  // And a real send still works over the surviving channel.
  const { sentVia } = await issueOtp('+919111000009');
  expect(sentVia).toBe('log');
});

test('an empty settings row leaves no channel enabled rather than guessing', async () => {
  await db.delete(platformSettings);
  await db.insert(platformSettings).values({
    otpChannels: ['whatsapp'],
    otpDefaultChannel: 'whatsapp',
  });
  invalidateOtpSettings();

  const settings = await getOtpSettings();
  expect(settings.channels).toEqual([]);
  await expect(issueOtp('+919111000010')).rejects.toThrow(/not enabled/i);
});

// --- Users module -------------------------------------------------------------
// users is the shared identity; `customers` is the users module's own table and
// is the only place customer-side data lives.

test('getMe returns the profile, defaulting customer fields when no row exists', async () => {
  const user = await createUser();
  const me = await getMe(user.id);
  expect(me.id).toBe(user.id);
  expect(me.phone).toBe(user.phone);
  expect(me.role).toBe('customer');
  // No customers row yet - absence means "individual, nothing extra".
  expect(me.customerType).toBe('individual');
  expect(me.companyName).toBeNull();
});

test('getMe reads B2B details from the customers table when present', async () => {
  const user = await createUser();
  await db.insert(customers).values({
    userId: user.id,
    customerType: 'business',
    companyName: 'Acme Logistics',
    gstin: '29ABCDE1234F1Z5',
  });
  const me = await getMe(user.id);
  expect(me.customerType).toBe('business');
  expect(me.companyName).toBe('Acme Logistics');
});

test('updateMe changes only the fields supplied', async () => {
  const user = await createUser();
  const updated = await updateMe(user.id, { name: 'Asha Rao' });
  expect(updated.name).toBe('Asha Rao');
  expect(updated.phone).toBe(user.phone); // untouched
  expect(updated.role).toBe('customer'); // not settable here
});

// users.email is unique, so a collision must read as a conflict rather than a 500.
test('updateMe reports an email already in use as a conflict', async () => {
  const first = await createUser();
  const second = await createUser();
  await updateMe(first.id, { email: 'taken@destow.in' });
  await expectReject(updateMe(second.id, { email: 'taken@destow.in' }), 409);
});

test('updateMe on a missing user is a 404, not a silent success', async () => {
  await expectReject(updateMe('00000000-0000-0000-0000-000000000000', { name: 'X' }), 404);
});

// --- Providers module ---------------------------------------------------------
// Becoming a provider is a role flip on the existing person, not a new account:
// same users row, same phone, same login history.

const AGENCY = { agencyName: 'Himalayan Cabs' };

test('registering as a provider creates a pending profile and flips the role', async () => {
  const user = await createUser();
  const provider = await registerProvider(user.id, AGENCY, ctx);

  expect(provider.agencyName).toBe('Himalayan Cabs');
  // Existing is not the same as bookable - an admin still has to approve.
  expect(provider.status).toBe('pending');
  // No ratings yet reads as "unrated", not zero stars.
  expect(provider.ratingAvg).toBeNull();

  const [after] = await db.select().from(users).where(eq(users.id, user.id));
  expect(after.role).toBe('provider');
  expect(after.phone).toBe(user.phone); // same identity, not a new account
});

// Their live tokens still claim role=customer, and the audience on a session can
// never change, so they must re-login into the partner app either way.
test('registering revokes the caller existing sessions', async () => {
  const user = await createUser();
  const s = await createSession({ userId: user.id, role: user.role, client: 'customer_app', ctx });

  await registerProvider(user.id, AGENCY, ctx);

  const [sess] = await db.select().from(sessions).where(eq(sessions.id, s.sessionId));
  expect(sess.revokedAt).not.toBeNull();
  expect(sess.revokedReason).toBe('role_changed');
  await expectReject(rotateRefresh(s.refreshToken, ctx), 401);
});

test('registering twice is a conflict, not a second profile', async () => {
  const user = await createUser();
  await registerProvider(user.id, AGENCY, ctx);
  await expectReject(registerProvider(user.id, AGENCY, ctx), 409);
});

// One account approving listings and owning them is a conflict of interest.
test('an admin cannot register as a provider', async () => {
  const admin = await createUser('active', 'admin');
  await expectReject(registerProvider(admin.id, AGENCY, ctx), 403);
});

test('getMyProvider returns the profile once registered, 404 before', async () => {
  const user = await createUser();
  await expectReject(getMyProvider(user.id), 404);
  await registerProvider(user.id, AGENCY, ctx);
  const mine = await getMyProvider(user.id);
  expect(mine.agencyName).toBe('Himalayan Cabs');
});

// After the flip they belong to the partner app, and the customer app must
// refuse them - the same client/role invariant, now exercised from the other side.
test('a newly registered provider is refused by the customer app', async () => {
  const user = await createUser();
  await registerProvider(user.id, AGENCY, ctx);
  const { code } = await issueOtp(user.phone);
  await expectReject(verifyOtp(user.phone, code, 'customer_app', ctx), 403);
});

test('and is accepted by the partner app', async () => {
  const user = await createUser();
  await registerProvider(user.id, AGENCY, ctx);
  const { code } = await issueOtp(user.phone);
  const login = await verifyOtp(user.phone, code, 'provider_app', ctx);
  expect(login.user.role).toBe('provider');
  expect(decodeJwt(login.accessToken).aud).toBe('provider_app');
});

// --- Admin module: two-factor sign-in -----------------------------------------
// Password AND phone OTP. Either alone mints nothing.

const ADMIN_PW = 'correct horse battery staple';

async function makeAdmin(email: string) {
  const user = await createUser('active', 'admin');
  await db.update(users).set({ email }).where(eq(users.id, user.id));
  await setAdminPassword(user.id, ADMIN_PW);
  return { ...user, email };
}

// adminPasswordStep sends an OTP we cannot read (it is stored hashed). issueOtp
// replaces any live code for that phone and returns the plaintext, so the test
// can complete the second factor without production code leaking anything.
async function freshCodeFor(phone: string) {
  const { code } = await issueOtp(phone);
  return code;
}

test('the password step alone mints no session, only a challenge', async () => {
  const admin = await makeAdmin('a1@destow.in');
  const challenge = await adminPasswordStep(admin.email, ADMIN_PW, ctx);
  expect(challenge.challengeToken.length).toBeGreaterThan(20);
  expect(challenge.phoneHint).toMatch(/^••••\d{4}$/);
  // Nothing that looks like a session came back.
  expect(challenge).not.toHaveProperty('accessToken');
  const rows = await db.select().from(sessions).where(eq(sessions.userId, admin.id));
  expect(rows).toHaveLength(0);
});

test('both factors together mint an admin_web session', async () => {
  const admin = await makeAdmin('a2@destow.in');
  const challenge = await adminPasswordStep(admin.email, ADMIN_PW, ctx);
  const code = await freshCodeFor(admin.phone);
  const result = await adminOtpStep(challenge.challengeToken, code, ctx);
  expect(result.user.role).toBe('admin');
  expect(decodeJwt(result.accessToken).aud).toBe('admin_web');
});

test('a wrong password is rejected and indistinguishable from an unknown email', async () => {
  const admin = await makeAdmin('a3@destow.in');
  await expectReject(adminPasswordStep(admin.email, 'wrong password here', ctx), 401);
  await expectReject(adminPasswordStep('nobody@destow.in', 'wrong password here', ctx), 401);
});

// A non-admin with a password must not get in through the admin door.
test('a customer with credentials still cannot use the admin login', async () => {
  const user = await createUser();
  await db.update(users).set({ email: 'cust@destow.in' }).where(eq(users.id, user.id));
  await setAdminPassword(user.id, ADMIN_PW);
  await expectReject(adminPasswordStep('cust@destow.in', ADMIN_PW, ctx), 401);
});

// A typo on the code must not force the whole password step again.
test('a wrong code does not burn the challenge', async () => {
  const admin = await makeAdmin('a4@destow.in');
  const challenge = await adminPasswordStep(admin.email, ADMIN_PW, ctx);
  await expectReject(adminOtpStep(challenge.challengeToken, '000000', ctx), 401);
  // Same challenge still usable with the right code.
  const result = await adminOtpStep(challenge.challengeToken, await freshCodeFor(admin.phone), ctx);
  expect(result.user.role).toBe('admin');
});

test('the password step locks the account after repeated failures', async () => {
  const admin = await makeAdmin('a5@destow.in');
  for (let i = 0; i < 5; i++) {
    await expectReject(adminPasswordStep(admin.email, 'nope nope nope', ctx), 401);
  }
  // Now locked - even the correct password is refused.
  await expectReject(adminPasswordStep(admin.email, ADMIN_PW, ctx), 429);
});

// --- Admin module: control plane ----------------------------------------------

test('an admin cannot change their own role', async () => {
  const admin = await makeAdmin('a6@destow.in');
  await expectReject(setUserRole(admin.id, admin.id, 'customer', ctx), 403);
});

test('the last admin cannot be demoted', async () => {
  const keeper = await makeAdmin('a7@destow.in');
  const actor = await makeAdmin('a8@destow.in');
  // Earlier tests in this file leave admins behind, so state the premise
  // explicitly rather than assuming a clean slate: demote everyone but these two.
  await db
    .update(users)
    .set({ role: 'customer' })
    .where(and(eq(users.role, 'admin'), notInArray(users.id, [keeper.id, actor.id])));

  // Two admins, so demoting one is allowed.
  await setUserRole(actor.id, keeper.id, 'customer', ctx);
  // `actor` is now the only admin left, so this must be refused.
  await expectReject(setUserRole(keeper.id, actor.id, 'customer', ctx), 409);
});

// Promoting someone with no password would create an account that can never
// sign in: the console needs both factors and the OTP path refuses admins.
test('promoting to admin without credentials is refused', async () => {
  const admin = await makeAdmin('a10@destow.in');
  const target = await createUser();
  await expectReject(setUserRole(admin.id, target.id, 'admin', ctx), 422);
  await setAdminPassword(target.id, ADMIN_PW);
  const res = await setUserRole(admin.id, target.id, 'admin', ctx);
  expect(res.role).toBe('admin');
});

test('a role change revokes the target sessions immediately', async () => {
  const admin = await makeAdmin('a11@destow.in');
  const target = await createUser();
  const s = await createSession({ userId: target.id, role: 'customer', client: 'customer_app', ctx });
  await setUserRole(admin.id, target.id, 'provider', ctx);
  const [sess] = await db.select().from(sessions).where(eq(sessions.id, s.sessionId));
  expect(sess.revokedReason).toBe('role_changed');
});

test('approving a provider flips it from pending', async () => {
  const owner = await createUser();
  const provider = await registerProvider(owner.id, AGENCY, ctx);
  expect(provider.status).toBe('pending');
  const updated = await setProviderStatus(provider.id, 'approved');
  expect(updated.status).toBe('approved');
});

// The write side of the admin-selectable OTP channel: a channel with no
// credentials is refused up front, not silently dropped at delivery time.
test('OTP settings refuse a channel with no credentials configured', async () => {
  await expectReject(
    updateOtpSettings({ channels: ['whatsapp'], defaultChannel: 'whatsapp' }),
    422,
  );
});

test('OTP settings accept an available channel and take effect immediately', async () => {
  await updateOtpSettings({ channels: ['log'], defaultChannel: 'log' });
  const settings = await getOtpSettings();
  expect(settings.channels).toEqual(['log']);
  expect(settings.defaultChannel).toBe('log');
});

test('OTP settings refuse a default that is not among the enabled channels', async () => {
  await expectReject(
    updateOtpSettings({ channels: ['log'], defaultChannel: 'whatsapp' }),
    422,
  );
});

// --- Customer quote path ------------------------------------------------------
// The client sends only from/to. Distance comes from the maps adapter and the
// fare from the pricing engine, so there is no number a client can send that
// changes a price.

async function approvedFleet(pricePerKmPaise: number, category: 'car' | 'bus' = 'car') {
  const owner = await createUser();
  const provider = await registerProvider(owner.id, AGENCY, ctx);
  await setProviderStatus(provider.id, 'approved');
  const [type] = await db
    .insert(vehicleTypes)
    .values({ category, name: `T${pricePerKmPaise}`, seats: 4, bags: 2 })
    .returning();
  const [vehicle] = await db
    .insert(vehicles)
    .values({
      serviceProviderId: provider.id,
      vehicleTypeId: type.id,
      pricePerKmPaise,
      status: 'approved',
      isActive: true,
    })
    .returning();
  return { provider, type, vehicle };
}

test('search returns a distance for a route without the client supplying one', async () => {
  const route = await searchRoute('Delhi', 'Manali');
  expect(Number.isInteger(route.distanceM)).toBe(true);
  expect(route.distanceM).toBeGreaterThan(0);
  expect(route.durationS).toBeGreaterThan(0);
});

// The same route must quote the same distance every time, or the price a
// customer sees changes between the listing and the booking.
test('the same route resolves to a stable distance', async () => {
  const a = await searchRoute('Delhi', 'Jaipur');
  const b = await searchRoute('Delhi', 'Jaipur');
  expect(b.distanceM).toBe(a.distanceM);
});

test('available vehicles are priced by the server from the resolved distance', async () => {
  const { vehicle } = await approvedFleet(1300);
  const { route, vehicles: listed } = await listAvailableVehicles('Delhi', 'Agra');
  const mine = listed.find((v) => v.vehicleId === vehicle.id);
  expect(mine).toBeDefined();
  // total = price_per_km * distance, in integer paise.
  expect(mine!.totalFarePaise).toBe(Math.round((1300 * route.distanceM) / 1000));
  expect(mine!.pricePerKmPaise).toBe(1300);
  expect(mine!.totalFareDisplay).toMatch(/^₹/);
});

// What Destow takes from the provider is a commercial term with the partner,
// not a line item on a customer's quote.
test('a quote never exposes commission or payout', async () => {
  await approvedFleet(1500);
  const { vehicles: listed } = await listAvailableVehicles('Delhi', 'Agra');
  expect(listed.length).toBeGreaterThan(0);
  for (const v of listed) {
    expect(v).not.toHaveProperty('commissionPaise');
    expect(v).not.toHaveProperty('providerPayoutPaise');
    expect(v).not.toHaveProperty('commissionBps');
  }
});

// The three gates that make admin approval mean something.
test('a pending provider fleet is not listed', async () => {
  const owner = await createUser();
  const provider = await registerProvider(owner.id, AGENCY, ctx); // stays pending
  const [type] = await db
    .insert(vehicleTypes)
    .values({ category: 'car', name: 'PendingType', seats: 4, bags: 2 })
    .returning();
  const [v] = await db
    .insert(vehicles)
    .values({
      serviceProviderId: provider.id,
      vehicleTypeId: type.id,
      pricePerKmPaise: 900,
      status: 'approved',
      isActive: true,
    })
    .returning();
  const { vehicles: listed } = await listAvailableVehicles('Delhi', 'Agra');
  expect(listed.find((x) => x.vehicleId === v.id)).toBeUndefined();
});

test('an unapproved or inactive vehicle is not listed', async () => {
  const { provider, type } = await approvedFleet(1000);
  const [pending] = await db
    .insert(vehicles)
    .values({ serviceProviderId: provider.id, vehicleTypeId: type.id, pricePerKmPaise: 100, status: 'pending', isActive: true })
    .returning();
  const [inactive] = await db
    .insert(vehicles)
    .values({ serviceProviderId: provider.id, vehicleTypeId: type.id, pricePerKmPaise: 100, status: 'approved', isActive: false })
    .returning();
  const { vehicles: listed } = await listAvailableVehicles('Delhi', 'Agra');
  const ids = listed.map((v) => v.vehicleId);
  expect(ids).not.toContain(pending.id);
  expect(ids).not.toContain(inactive.id);
});

test('the category filter narrows cars from buses', async () => {
  await approvedFleet(1100, 'car');
  await approvedFleet(4000, 'bus');
  const cars = await listAvailableVehicles('Delhi', 'Agra', 'car');
  expect(cars.vehicles.every((v) => v.category === 'car')).toBe(true);
  const buses = await listAvailableVehicles('Delhi', 'Agra', 'bus');
  expect(buses.vehicles.every((v) => v.category === 'bus')).toBe(true);
  expect(buses.vehicles.length).toBeGreaterThan(0);
});

test('results are cheapest first', async () => {
  await approvedFleet(2500);
  await approvedFleet(800);
  const { vehicles: listed } = await listAvailableVehicles('Delhi', 'Agra');
  const fares = listed.map((v) => v.totalFarePaise);
  expect([...fares].sort((a, b) => a - b)).toEqual(fares);
});

// --- Provider fleet and roster ------------------------------------------------
// No operation takes a provider id: it is resolved from the caller's token, so
// another partner's row simply never matches.

async function partnerWithType() {
  const owner = await createUser();
  const provider = await registerProvider(owner.id, AGENCY, ctx);
  const [type] = await db
    .insert(vehicleTypes)
    .values({ category: 'car', name: `Type-${provider.id.slice(0, 8)}`, seats: 4, bags: 2 })
    .returning();
  return { owner, provider, type };
}

test('a new vehicle lands pending, never bookable on creation', async () => {
  const { owner, type } = await partnerWithType();
  const v = await createVehicle(owner.id, { vehicleTypeId: type.id, pricePerKmPaise: 1300 });
  expect(v.status).toBe('pending');
  expect(v.isActive).toBe(true);
});

test('an unknown vehicle type is refused rather than created on the fly', async () => {
  const { owner } = await partnerWithType();
  await expectReject(
    createVehicle(owner.id, {
      vehicleTypeId: '00000000-0000-0000-0000-000000000000',
      pricePerKmPaise: 1300,
    }),
    422,
  );
});

// The invariant the whole module rests on.
test('a partner cannot read or modify another partner fleet', async () => {
  const a = await partnerWithType();
  const b = await partnerWithType();
  const vehicleA = await createVehicle(a.owner.id, {
    vehicleTypeId: a.type.id,
    pricePerKmPaise: 1300,
  });

  // B cannot see A's vehicle...
  const bList = await listVehicles(b.owner.id);
  expect(bList.find((v) => v.id === vehicleA.id)).toBeUndefined();

  // ...nor change its price, even knowing the id.
  await expectReject(updateVehicle(b.owner.id, vehicleA.id, { pricePerKmPaise: 1 }), 404);

  // And A's price is untouched.
  const [still] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA.id));
  expect(still.pricePerKmPaise).toBe(1300);
});

test('a partner can update their own price and availability', async () => {
  const { owner, type } = await partnerWithType();
  const v = await createVehicle(owner.id, { vehicleTypeId: type.id, pricePerKmPaise: 1300 });
  const updated = await updateVehicle(owner.id, v.id, { pricePerKmPaise: 1450, isActive: false });
  expect(updated.pricePerKmPaise).toBe(1450);
  expect(updated.isActive).toBe(false);
  // A rate change does not send it back for approval - approval is about the
  // vehicle being real, not about what it charges.
  expect(updated.status).toBe(v.status);
});

test('a user with no provider profile cannot touch fleet endpoints', async () => {
  const stranger = await createUser();
  await expectReject(listVehicles(stranger.id), 404);
});

// Drivers get called by customers, so their number goes through the same
// canonicalization as a login phone.
test('a driver phone is canonicalized to E.164', async () => {
  const { owner } = await partnerWithType();
  const d = await createDriver(owner.id, { name: 'Rajesh Kumar', phone: '98765 43210' });
  expect(d.phone).toBe('+919876543210');
});

test('a partner cannot modify another partner driver', async () => {
  const a = await partnerWithType();
  const b = await partnerWithType();
  const driverA = await createDriver(a.owner.id, { name: 'A Driver', phone: '9876500011' });
  await expectReject(updateDriver(b.owner.id, driverA.id, { name: 'Hijacked' }), 404);
});

// The end-to-end supply gate: nothing a partner lists is sellable until an admin
// approves both the partner and the vehicle.
test('a vehicle becomes bookable only after both approvals', async () => {
  const { owner, provider, type } = await partnerWithType();
  const v = await createVehicle(owner.id, { vehicleTypeId: type.id, pricePerKmPaise: 1200 });

  const notYet = await listAvailableVehicles('Delhi', 'Agra');
  expect(notYet.vehicles.find((x) => x.vehicleId === v.id)).toBeUndefined();

  await setProviderStatus(provider.id, 'approved');
  const stillNot = await listAvailableVehicles('Delhi', 'Agra');
  expect(stillNot.vehicles.find((x) => x.vehicleId === v.id)).toBeUndefined();

  await setVehicleStatus(v.id, 'approved');
  const now = await listAvailableVehicles('Delhi', 'Agra');
  const listed = now.vehicles.find((x) => x.vehicleId === v.id);
  expect(listed).toBeDefined();
  expect(listed!.totalFarePaise).toBe(Math.round((1200 * now.route.distanceM) / 1000));
});

// --- Bookings -----------------------------------------------------------------
// Where a quote becomes a commitment. The fare is computed here and frozen: a
// later rate or commission change must never alter an agreed booking.

const TOMORROW = () => new Date(Date.now() + 24 * 3600 * 1000);

async function bookableVehicle(pricePerKmPaise: number) {
  const owner = await createUser();
  const provider = await registerProvider(owner.id, AGENCY, ctx);
  await setProviderStatus(provider.id, 'approved');
  const [type] = await db
    .insert(vehicleTypes)
    .values({ category: 'car', name: `B-${pricePerKmPaise}`, seats: 4, bags: 2 })
    .returning();
  const [vehicle] = await db
    .insert(vehicles)
    .values({
      serviceProviderId: provider.id,
      vehicleTypeId: type.id,
      pricePerKmPaise,
      status: 'approved',
      isActive: true,
    })
    .returning();
  return { owner, provider, type, vehicle };
}

test('a booking freezes the fare the server computed', async () => {
  const customer = await createUser();
  const { vehicle } = await bookableVehicle(1300);
  const route = await searchRoute('Delhi', 'Agra');

  const b = await createBooking(customer.id, {
    vehicleId: vehicle.id,
    from: 'Delhi',
    to: 'Agra',
    pickupDatetime: TOMORROW(),
    tripType: 'one_way',
  });

  expect(b.status).toBe('pending');
  expect(b.paymentStatus).toBe('pending');
  expect(b.distanceM).toBe(route.distanceM);
  expect(b.pricePerKmPaise).toBe(1300);
  expect(b.totalFarePaise).toBe(Math.round((1300 * route.distanceM) / 1000));

  // The commission side is stored but never shown to the customer.
  const [row] = await db.select().from(bookings).where(eq(bookings.id, b.id));
  expect(row.commissionPaise + row.providerPayoutPaise).toBe(row.totalFarePaise);
  expect(row.commissionBps).toBeGreaterThanOrEqual(1500);
  expect(row.commissionBps).toBeLessThanOrEqual(2000);
});

// The reason the snapshot exists.
test('changing the vehicle price later does not alter an existing booking', async () => {
  const customer = await createUser();
  const { owner, vehicle } = await bookableVehicle(1000);
  const b = await createBooking(customer.id, {
    vehicleId: vehicle.id,
    from: 'Delhi',
    to: 'Agra',
    pickupDatetime: TOMORROW(),
    tripType: 'one_way',
  });
  const agreed = b.totalFarePaise;

  await updateVehicle(owner.id, vehicle.id, { pricePerKmPaise: 9000 });

  const after = await getMyBooking(customer.id, b.id);
  expect(after.totalFarePaise).toBe(agreed);
  expect(after.pricePerKmPaise).toBe(1000);
});

test('a customer never sees commission on their own booking', async () => {
  const customer = await createUser();
  const { vehicle } = await bookableVehicle(1200);
  const b = await createBooking(customer.id, {
    vehicleId: vehicle.id, from: 'Delhi', to: 'Agra', pickupDatetime: TOMORROW(), tripType: 'one_way',
  });
  for (const field of ['commissionPaise', 'providerPayoutPaise', 'commissionBps']) {
    expect(b).not.toHaveProperty(field);
  }
  const fetched = await getMyBooking(customer.id, b.id);
  expect(fetched).not.toHaveProperty('commissionPaise');
});

// The listing is a moment in time; this is the moment that counts.
test('a vehicle deactivated after the quote cannot be booked', async () => {
  const customer = await createUser();
  const { owner, vehicle } = await bookableVehicle(1100);
  await updateVehicle(owner.id, vehicle.id, { isActive: false });
  await expectReject(
    createBooking(customer.id, {
      vehicleId: vehicle.id, from: 'Delhi', to: 'Agra', pickupDatetime: TOMORROW(), tripType: 'one_way',
    }),
    409,
  );
});

test('a pending provider vehicle cannot be booked', async () => {
  const customer = await createUser();
  const owner = await createUser();
  const provider = await registerProvider(owner.id, AGENCY, ctx); // pending
  const [type] = await db
    .insert(vehicleTypes).values({ category: 'car', name: 'PendBook', seats: 4, bags: 2 }).returning();
  const [v] = await db
    .insert(vehicles)
    .values({ serviceProviderId: provider.id, vehicleTypeId: type.id, pricePerKmPaise: 1000, status: 'approved', isActive: true })
    .returning();
  await expectReject(
    createBooking(customer.id, {
      vehicleId: v.id, from: 'Delhi', to: 'Agra', pickupDatetime: TOMORROW(), tripType: 'one_way',
    }),
    409,
  );
});

test('a customer cannot read another customer booking', async () => {
  const alice = await createUser();
  const bob = await createUser();
  const { vehicle } = await bookableVehicle(1000);
  const b = await createBooking(alice.id, {
    vehicleId: vehicle.id, from: 'Delhi', to: 'Agra', pickupDatetime: TOMORROW(), tripType: 'one_way',
  });
  await expectReject(getMyBooking(bob.id, b.id), 404);
});

// The old backend returned the current page's row count as `count`, so a client
// could never render "page 2 of 5".
test('history paginates with a real total and a working status filter', async () => {
  const customer = await createUser();
  const { vehicle } = await bookableVehicle(1000);
  for (let i = 0; i < 3; i++) {
    await createBooking(customer.id, {
      vehicleId: vehicle.id, from: 'Delhi', to: 'Agra', pickupDatetime: TOMORROW(), tripType: 'one_way',
    });
  }

  const page1 = await listMyBookings(customer.id, { page: 1, limit: 2 });
  expect(page1.items).toHaveLength(2);
  expect(page1.total).toBe(3); // total, not page length
  expect(page1.page).toBe(1);

  const page2 = await listMyBookings(customer.id, { page: 2, limit: 2 });
  expect(page2.items).toHaveLength(1);
  expect(page2.total).toBe(3);

  // The status filter is actually applied - it was silently ignored before.
  const completed = await listMyBookings(customer.id, { page: 1, limit: 20, status: 'completed' });
  expect(completed.total).toBe(0);
  const pending = await listMyBookings(customer.id, { page: 1, limit: 20, status: 'pending' });
  expect(pending.total).toBe(3);
});

// --- Fulfilment: the trip actually runs, and commission accrues ---------------

async function bookedTrip(pricePerKmPaise = 1300) {
  const customer = await createUser();
  const { owner, provider, vehicle } = await bookableVehicle(pricePerKmPaise);
  const driver = await createDriver(owner.id, { name: 'Rajesh', phone: '9876500099' });
  const booking = await createBooking(customer.id, {
    vehicleId: vehicle.id, from: 'Delhi', to: 'Agra', pickupDatetime: TOMORROW(), tripType: 'one_way',
  });
  return { customer, owner, provider, vehicle, driver, booking };
}

test('the full lifecycle runs and commission accrues only on completion', async () => {
  const { owner, driver, booking } = await bookedTrip(1300);

  // Nothing earned while the trip is merely booked.
  expect((await getEarnings(owner.id)).completedTrips).toBe(0);
  expect((await getEarnings(owner.id)).commissionPaise).toBe(0);

  expect((await acceptBooking(owner.id, booking.id)).status).toBe('confirmed');
  const assigned = await assignDriver(owner.id, booking.id, driver.id);
  expect(assigned.status).toBe('assigned');
  // Snapshotted so the customer's record survives the driver leaving.
  expect(assigned.driverName).toBe('Rajesh');
  expect(assigned.driverPhone).toBe('+919876500099');

  expect((await startTrip(owner.id, booking.id)).status).toBe('ongoing');

  // Still nothing earned - the trip is running but not finished.
  expect((await getEarnings(owner.id)).completedTrips).toBe(0);

  const done = await completeTrip(owner.id, booking.id);
  expect(done.status).toBe('completed');
  expect(done.completedAt).not.toBeNull();

  const earnings = await getEarnings(owner.id);
  expect(earnings.completedTrips).toBe(1);
  expect(earnings.grossPaise).toBe(booking.totalFarePaise);
  expect(earnings.commissionPaise + earnings.netPayoutPaise).toBe(earnings.grossPaise);
  expect(earnings.commissionPaise).toBeGreaterThan(0);
});

// The invariant that protects the money: revenue cannot be booked for a trip
// that never ran.
test('a booking cannot skip straight to completed', async () => {
  const { owner, booking } = await bookedTrip();
  await expectReject(completeTrip(owner.id, booking.id), 409);
  await acceptBooking(owner.id, booking.id);
  await expectReject(completeTrip(owner.id, booking.id), 409); // still not started
});

test('completing twice does not accrue commission twice', async () => {
  const { owner, driver, booking } = await bookedTrip(1000);
  await acceptBooking(owner.id, booking.id);
  await assignDriver(owner.id, booking.id, driver.id);
  await startTrip(owner.id, booking.id);
  await completeTrip(owner.id, booking.id);

  await expectReject(completeTrip(owner.id, booking.id), 409);

  const earnings = await getEarnings(owner.id);
  expect(earnings.completedTrips).toBe(1);
  expect(earnings.grossPaise).toBe(booking.totalFarePaise);
});

test('a partner cannot act on another partner booking', async () => {
  const { booking } = await bookedTrip();
  const other = await createUser();
  await registerProvider(other.id, AGENCY, ctx);
  await expectReject(acceptBooking(other.id, booking.id), 404);
  await expectReject(completeTrip(other.id, booking.id), 404);
});

// Assigning someone else's driver would hand their personal number to a
// stranger's customer.
test('a partner cannot assign another partner driver', async () => {
  const { owner, booking } = await bookedTrip();
  const rivalOwner = await createUser();
  await registerProvider(rivalOwner.id, AGENCY, ctx);
  const rivalDriver = await createDriver(rivalOwner.id, { name: 'Rival', phone: '9876500098' });

  await acceptBooking(owner.id, booking.id);
  await expectReject(assignDriver(owner.id, booking.id, rivalDriver.id), 404);
});

test('an inactive driver cannot be assigned', async () => {
  const { owner, driver, booking } = await bookedTrip();
  await updateDriver(owner.id, driver.id, { status: 'inactive' });
  await acceptBooking(owner.id, booking.id);
  await expectReject(assignDriver(owner.id, booking.id, driver.id), 409);
});

// An incoming request is still an offer - browsing the queue must not be a way
// to harvest customer phone numbers.
test('a customer phone is withheld until the partner accepts', async () => {
  const { owner, booking } = await bookedTrip();
  const pending = await listProviderBookings(owner.id, 'pending');
  expect(pending.find((b) => b.id === booking.id)!.customerPhone).toBeNull();

  await acceptBooking(owner.id, booking.id);
  const confirmed = await listProviderBookings(owner.id, 'confirmed');
  expect(confirmed.find((b) => b.id === booking.id)!.customerPhone).toMatch(/^\+91/);
});

// A partner sees their own economics in full; the customer never does.
test('the partner queue shows commission, the customer view does not', async () => {
  const { customer, owner, booking } = await bookedTrip();
  const [row] = await listProviderBookings(owner.id);
  expect(row.commissionPaise).toBeGreaterThan(0);
  expect(row.providerPayoutPaise).toBeGreaterThan(0);

  const customerView = await getMyBooking(customer.id, booking.id);
  expect(customerView).not.toHaveProperty('commissionPaise');
});

test('a customer can cancel before the trip starts but not after', async () => {
  const { customer, owner, driver, booking } = await bookedTrip();
  const cancelled = await cancelMyBooking(customer.id, booking.id);
  expect(cancelled.status).toBe('cancelled');
  // Terminal - a second cancel is refused rather than silently repeated.
  await expectReject(cancelMyBooking(customer.id, booking.id), 409);

  const second = await bookedTrip();
  await acceptBooking(second.owner.id, second.booking.id);
  await assignDriver(second.owner.id, second.booking.id, second.driver.id);
  await startTrip(second.owner.id, second.booking.id);
  // The vehicle is on the road with them in it.
  await expectReject(cancelMyBooking(second.customer.id, second.booking.id), 409);
});

test('a cancelled trip earns nothing', async () => {
  const { customer, owner, booking } = await bookedTrip();
  await cancelMyBooking(customer.id, booking.id);
  const earnings = await getEarnings(owner.id);
  expect(earnings.completedTrips).toBe(0);
  expect(earnings.commissionPaise).toBe(0);
});
