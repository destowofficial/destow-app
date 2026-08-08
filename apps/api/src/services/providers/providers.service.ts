import { eq } from 'drizzle-orm';
import type { ProviderProfile, RegisterProviderBody } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { users, serviceProviders } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { revokeAllForUser, type SessionContext } from '../auth/session.service.js';

// The providers module owns `service_providers`. `users` stays the shared
// identity - becoming a provider is a role flip on the existing person, not a
// new account, so their phone number and login history carry over.

type ProviderRow = typeof serviceProviders.$inferSelect;

function toProfile(row: ProviderRow): ProviderProfile {
  return {
    id: row.id,
    agencyName: row.agencyName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    gstin: row.gstin,
    status: row.status,
    // Averaged here rather than stored, so the sum/count stay the source of
    // truth and a new provider reads as "no rating yet" instead of zero stars.
    ratingAvg: row.ratingCount > 0 ? row.ratingSum / row.ratingCount : null,
    ratingCount: row.ratingCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getMyProvider(userId: string): Promise<ProviderProfile> {
  const [row] = await db
    .select()
    .from(serviceProviders)
    .where(eq(serviceProviders.ownerUserId, userId))
    .limit(1);
  if (!row) throw AppError.notFound('No provider profile for this account');
  return toProfile(row);
}

export async function registerProvider(
  userId: string,
  body: RegisterProviderBody,
  ctx: SessionContext = {},
): Promise<ProviderProfile> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw AppError.notFound('User not found');

  // An admin becoming a provider would let one account both approve listings and
  // own them. Refuse rather than quietly demote.
  if (user.role === 'admin') {
    throw AppError.forbidden('An admin account cannot be registered as a provider');
  }

  const [existing] = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(eq(serviceProviders.ownerUserId, userId))
    .limit(1);
  if (existing) throw AppError.conflict('This account already has a provider profile');

  // Both writes or neither: a user left with role=provider and no provider row
  // could log into the partner app and find nothing there, with no way back.
  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(serviceProviders)
      .values({
        ownerUserId: userId,
        agencyName: body.agencyName,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        gstin: body.gstin,
        // Registration creates the partner; an admin approves them for listing.
        // Existing is not the same as bookable.
        status: 'pending',
      })
      .returning();
    await tx.update(users).set({ role: 'provider' }).where(eq(users.id, userId));
    return row;
  });

  // Their live tokens still say role=customer and aud=customer_app. The audience
  // is read from the stored session on refresh and can never change, so they must
  // re-login into the partner app regardless - revoking makes that immediate
  // instead of leaving a token that misstates who they now are.
  await revokeAllForUser(userId, 'role_changed', ctx);

  return toProfile(created);
}
