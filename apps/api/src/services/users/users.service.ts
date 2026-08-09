import { and, count, eq } from 'drizzle-orm';
import type { UpdateMeBody, UserProfile } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { users, customers, bookings } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';

// The users module owns the `customers` table - no other module reads or writes
// it. `users` stays the shared identity every session and booking points at.

type UserRow = typeof users.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;

// A customer with nothing beyond the defaults has no row at all, so absence is
// meaningful rather than an error: it means "individual, no B2B details".
function toProfile(user: UserRow, customer: CustomerRow | null, totalTrips: number): UserProfile {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    customerType: customer?.customerType ?? 'individual',
    companyName: customer?.companyName ?? null,
    gstin: customer?.gstin ?? null,
    totalTrips,
    createdAt: user.createdAt.toISOString(),
  };
}

// Drizzle wraps driver failures in its own error, so the Postgres SQLSTATE sits
// on the cause rather than the thrown object. Walk the chain instead of reading
// err.code, which is undefined here and would turn a conflict into a 500.
function sqlStateOf(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

async function loadProfile(userId: string): Promise<UserProfile> {
  const [row] = await db
    .select({ user: users, customer: customers })
    .from(users)
    .leftJoin(customers, eq(customers.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw AppError.notFound('User not found');

  // Completed trips only: a pending or cancelled booking is not a trip taken,
  // and this sits next to the customer's name on the home screen.
  const [{ trips }] = await db
    .select({ trips: count() })
    .from(bookings)
    .where(and(eq(bookings.customerUserId, userId), eq(bookings.status, 'completed')));

  return toProfile(row.user, row.customer, trips);
}

export async function getMe(userId: string): Promise<UserProfile> {
  return loadProfile(userId);
}

// The users module owns `customers`, so B2B details are written here and
// nowhere else. The row is created on first use rather than at signup: an
// individual customer never needs one, and an empty row would be a write per
// account for data nothing reads.
async function upsertCustomerProfile(userId: string, patch: UpdateMeBody): Promise<void> {
  const touchesB2B =
    patch.customerType !== undefined ||
    patch.companyName !== undefined ||
    patch.gstin !== undefined;
  if (!touchesB2B) return;

  const values = {
    ...(patch.customerType !== undefined ? { customerType: patch.customerType } : {}),
    ...(patch.companyName !== undefined ? { companyName: patch.companyName } : {}),
    ...(patch.gstin !== undefined ? { gstin: patch.gstin } : {}),
  };

  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (existing) {
    await db.update(customers).set(values).where(eq(customers.id, existing.id));
  } else {
    await db.insert(customers).values({ userId, ...values });
  }
}

export async function updateMe(userId: string, patch: UpdateMeBody): Promise<UserProfile> {
  // Identity fields live on `users`, B2B details on `customers`. A patch may
  // touch either or both, and an UPDATE with nothing to set is an error rather
  // than a no-op - so only run the one that actually has changes.
  const userFields = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
  };

  try {
    if (Object.keys(userFields).length > 0) {
      const [updated] = await db
        .update(users)
        .set(userFields)
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      if (!updated) throw AppError.notFound('User not found');
    } else {
      // Still confirm the account exists, so a B2B-only patch for a missing
      // user is a 404 rather than a silently created customers row.
      const [exists] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!exists) throw AppError.notFound('User not found');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // users.email is unique. Report the collision as a conflict rather than a
    // 500, and without echoing the address back - it belongs to someone else.
    if (sqlStateOf(err) === '23505') {
      throw AppError.conflict('That email address is already in use');
    }
    throw err;
  }

  await upsertCustomerProfile(userId, patch);

  return loadProfile(userId);
}
