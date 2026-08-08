import { and, eq, ne, count } from 'drizzle-orm';
import type { UserRole, ProviderStatus, OtpChannel } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { users, admins, serviceProviders, platformSettings } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { hashPassword } from '../../lib/auth/password.js';
import { revokeAllForUser, type SessionContext } from '../auth/session.service.js';
import { env, channelsWithCredentials } from '../../config/env.js';
import { invalidateOtpSettings } from '../settings/otp-settings.service.js';

// The admin module owns `admins` and the control-plane actions. It is the only
// module that changes another user's role or a provider's status.

export async function setUserRole(
  actorUserId: string,
  targetUserId: string,
  role: UserRole,
  ctx: SessionContext = {},
): Promise<{ id: string; role: UserRole }> {
  // Changing your own role is how an admin accidentally locks themselves out of
  // the console, and it is never something a second admin could not do instead.
  if (actorUserId === targetUserId) {
    throw AppError.forbidden('An admin cannot change their own role');
  }

  const [target] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target) throw AppError.notFound('User not found');
  if (target.role === role) return { id: target.id, role };

  // Losing the last admin means no one can approve providers, assign roles or
  // change settings ever again - there is no recovery path short of SQL.
  if (target.role === 'admin') {
    const [{ remaining }] = await db
      .select({ remaining: count() })
      .from(users)
      .where(and(eq(users.role, 'admin'), ne(users.id, targetUserId)));
    if (remaining === 0) throw AppError.conflict('Cannot demote the last remaining admin');
  }

  // Promoting to admin without a password would create an account that can never
  // sign in: the admin console needs both factors, and the OTP path refuses admins.
  if (role === 'admin') {
    const [cred] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.userId, targetUserId))
      .limit(1);
    if (!cred) {
      throw AppError.unprocessable(
        'Set a password for this account before promoting it to admin',
        { role: ['Target has no admin credentials'] },
      );
    }
  }

  await db.update(users).set({ role }).where(eq(users.id, targetUserId));

  // Their live tokens still carry the old role and the old audience. Revoking
  // makes the change immediate rather than leaving a token that misstates it
  // until the next refresh.
  await revokeAllForUser(targetUserId, 'role_changed', ctx);

  return { id: targetUserId, role };
}

export async function setProviderStatus(
  providerId: string,
  status: ProviderStatus,
): Promise<{ id: string; status: ProviderStatus }> {
  const [updated] = await db
    .update(serviceProviders)
    .set({ status })
    .where(eq(serviceProviders.id, providerId))
    .returning({ id: serviceProviders.id, status: serviceProviders.status });
  if (!updated) throw AppError.notFound('Provider not found');
  return updated;
}

export async function listProviders(status?: ProviderStatus) {
  return db
    .select({
      id: serviceProviders.id,
      agencyName: serviceProviders.agencyName,
      status: serviceProviders.status,
      gstin: serviceProviders.gstin,
      ownerPhone: users.phone,
      createdAt: serviceProviders.createdAt,
    })
    .from(serviceProviders)
    .innerJoin(users, eq(users.id, serviceProviders.ownerUserId))
    .where(status ? eq(serviceProviders.status, status) : undefined)
    .orderBy(serviceProviders.createdAt);
}

// Give an existing user admin credentials. Separate from role assignment so the
// password exists before the promotion, never the other way round.
export async function setAdminPassword(targetUserId: string, password: string): Promise<void> {
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target) throw AppError.notFound('User not found');

  const passwordHash = await hashPassword(password);
  const [existing] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.userId, targetUserId))
    .limit(1);

  if (existing) {
    await db
      .update(admins)
      .set({ passwordHash, passwordUpdatedAt: new Date(), failedAttempts: 0, lockedUntil: null })
      .where(eq(admins.id, existing.id));
  } else {
    await db.insert(admins).values({ userId: targetUserId, passwordHash, passwordUpdatedAt: new Date() });
  }
}

export interface OtpSettingsPatch {
  channels: OtpChannel[];
  defaultChannel: OtpChannel;
  fallbackChannel?: OtpChannel | null;
}

// The write side of the admin-selectable OTP channel. Credentials stay in env;
// this only decides what is switched on. A channel with no credentials is
// refused here rather than silently dropped at delivery time, so an admin gets
// told why instead of watching logins quietly stop working.
export async function updateOtpSettings(patch: OtpSettingsPatch) {
  const available = channelsWithCredentials(env);

  const missing = patch.channels.filter((c) => !available.includes(c));
  if (missing.length > 0) {
    throw AppError.unprocessable('Validation failed', {
      channels: [
        `No credentials configured for: ${missing.join(', ')}. Available: ${available.join(', ') || 'none'}`,
      ],
    });
  }
  if (!patch.channels.includes(patch.defaultChannel)) {
    throw AppError.unprocessable('Validation failed', {
      defaultChannel: ['The default channel must be one of the enabled channels'],
    });
  }
  if (patch.fallbackChannel && !patch.channels.includes(patch.fallbackChannel)) {
    throw AppError.unprocessable('Validation failed', {
      fallbackChannel: ['The fallback channel must be one of the enabled channels'],
    });
  }

  const values = {
    otpChannels: patch.channels,
    otpDefaultChannel: patch.defaultChannel,
    otpFallbackChannel: patch.fallbackChannel ?? null,
  };

  const [existing] = await db.select({ id: platformSettings.id }).from(platformSettings).limit(1);
  if (existing) {
    await db.update(platformSettings).set(values).where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values(values);
  }

  // Make it visible on this instance now; others pick it up when their cache
  // entry expires.
  invalidateOtpSettings();
  return values;
}
