import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';
import { seedDatabase } from './seed';

const ALL_TABLES =
  'bookings, ratings, drivers, vehicles, vehicle_types, service_providers, platform_settings, otps, users';

describe('seedDatabase', () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    await pool.query(`TRUNCATE ${ALL_TABLES} RESTART IDENTITY CASCADE`);
  });
  afterAll(async () => {
    await pool.end();
  });

  it('seeds the vehicle-type catalog + platform settings, idempotently', async () => {
    await seedDatabase(db);
    await seedDatabase(db); // second run must not duplicate

    const types = await db.select().from(schema.vehicleTypes);
    const settings = await db.select().from(schema.platformSettings);

    expect(types.length).toBe(5);
    expect(types.filter((t) => t.category === 'bus').length).toBe(2);
    expect(settings.length).toBe(1);
    expect(settings[0].commissionBps).toBe(1800);
  });
});
