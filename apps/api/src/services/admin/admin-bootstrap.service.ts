import { eq } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { users, admins } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { canonicalizePhone } from '../../lib/auth/phone.js';
import { hashPassword } from '../../lib/auth/password.js';

// Creates the first admin, once. Idempotent and deliberately inert once any
// admin exists: leaving ADMIN_* set after the first deploy must not silently
// recreate or reset the account. Every admin after this one is promoted through
// the admin API, which is auditable; this exists only to break the bootstrap
// circularity of needing an admin to create an admin.
export async function ensureAdminBootstrap(): Promise<'created' | 'skipped'> {
  const { ADMIN_PHONE, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD } = env;
  if (!ADMIN_PHONE || !ADMIN_EMAIL || !ADMIN_INITIAL_PASSWORD) return 'skipped';

  const [anyAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  if (anyAdmin) return 'skipped';

  const phone = canonicalizePhone(ADMIN_PHONE);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  // Hash before the transaction: a weak bootstrap password must fail loudly
  // here, not leave a half-created admin behind.
  const passwordHash = await hashPassword(ADMIN_INITIAL_PASSWORD);

  await db.transaction(async (tx) => {
    // The phone may already belong to a customer - promote that person rather
    // than colliding on the unique index.
    const [existing] = await tx.select().from(users).where(eq(users.phone, phone)).limit(1);
    const user = existing
      ? (await tx.update(users).set({ role: 'admin', email }).where(eq(users.id, existing.id)).returning())[0]
      : (await tx.insert(users).values({ phone, email, name: 'Destow Admin', role: 'admin' }).returning())[0];
    await tx.insert(admins).values({ userId: user.id, passwordHash, passwordUpdatedAt: new Date() });
  });

  console.log(`[admin] bootstrapped the first admin (${email})`);
  return 'created';
}
