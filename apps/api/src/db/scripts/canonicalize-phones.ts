import { eq } from 'drizzle-orm';
import { db, pool } from '../connection.js';
import { users, otps } from '../schema.js';
import { canonicalizePhone } from '../../lib/auth/phone.js';

// One-off backfill for the E.164 change. Two rules:
//   1. Nothing is written if two rows would collide on the users.phone unique
//      index. Silently merging two people's accounts is far worse than a failed
//      migration, so this reports and exits non-zero instead.
//   2. Every otps row is dropped. They have a five-minute TTL and their phone
//      column is about to stop matching what verifyOtp looks up.
async function main() {
  const rows = await db.select({ id: users.id, phone: users.phone }).from(users);

  const canonical = new Map<string, string>(); // userId -> canonical phone
  const seen = new Map<string, string>(); // canonical phone -> first userId
  const collisions: string[] = [];
  const unparseable: string[] = [];

  for (const row of rows) {
    let next: string;
    try {
      next = canonicalizePhone(row.phone);
    } catch {
      unparseable.push(`${row.id} (${row.phone})`);
      continue;
    }
    const existing = seen.get(next);
    if (existing) {
      collisions.push(`${next}: ${existing} and ${row.id}`);
      continue;
    }
    seen.set(next, row.id);
    if (next !== row.phone) canonical.set(row.id, next);
  }

  if (unparseable.length > 0) {
    console.error(`Refusing to run - ${unparseable.length} phone(s) cannot be parsed:`);
    for (const line of unparseable) console.error(`  ${line}`);
  }
  if (collisions.length > 0) {
    console.error(`Refusing to run - ${collisions.length} collision(s) on users.phone:`);
    for (const line of collisions) console.error(`  ${line}`);
  }
  if (unparseable.length > 0 || collisions.length > 0) {
    console.error('Resolve these by hand, then re-run.');
    await pool.end();
    process.exit(1);
  }

  await db.transaction(async (tx) => {
    for (const [id, phone] of canonical) {
      await tx.update(users).set({ phone }).where(eq(users.id, id));
    }
    await tx.delete(otps);
  });

  console.log(`Canonicalized ${canonical.size} of ${rows.length} phone(s); cleared otps.`);
  await pool.end();
}

main();
