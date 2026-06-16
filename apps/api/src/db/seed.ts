import { pathToFileURL } from 'node:url';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { vehicleTypes, platformSettings } from './schema.js';

type Db = NodePgDatabase<typeof schema>;

// Idempotent baseline data for local/dev: platform commission + the vehicle-type catalog.
export async function seedDatabase(db: Db): Promise<void> {
  const settings = await db.select({ id: platformSettings.id }).from(platformSettings).limit(1);
  if (settings.length === 0) {
    await db.insert(platformSettings).values({ commissionBps: 1800 }); // 18%
  }

  const types = await db.select({ id: vehicleTypes.id }).from(vehicleTypes).limit(1);
  if (types.length === 0) {
    await db.insert(vehicleTypes).values([
      { category: 'car', name: 'Mini', seats: 4, bags: 1, refPricePerKmPaise: 1000 },
      { category: 'car', name: 'Sedan', seats: 4, bags: 2, refPricePerKmPaise: 1300 },
      { category: 'car', name: 'SUV', seats: 6, bags: 3, refPricePerKmPaise: 2000 },
      { category: 'bus', name: 'Tempo Traveller', seats: 12, bags: 12, refPricePerKmPaise: 2500 },
      { category: 'bus', name: 'AC Sleeper Bus', seats: 36, bags: 30, refPricePerKmPaise: 4000 },
    ]);
  }
}

// Runs only when executed directly (npm run db:seed), not when imported by tests.
async function run() {
  const { db, pool } = await import('./connection.js');
  await seedDatabase(db);
  console.log('✅ Database seeded');
  await pool.end();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
