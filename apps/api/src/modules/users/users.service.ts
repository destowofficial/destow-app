import { db } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import type { User } from '../../db/schema.js';

export async function getUserById(userId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function updateUser(userId: string, data: { name?: string; avatarUrl?: string }): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}
