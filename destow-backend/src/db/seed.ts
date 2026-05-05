/**
 * Database seeder — inserts default cab types on first run.
 * Run: tsx src/db/seed.ts
 */
import { db } from './connection.js';
import { cabTypes } from './schema.js';

async function seed() {
  console.log('🌱 Seeding database...');

  await db.insert(cabTypes).values([
    {
      name: 'Sedan',
      seats: 4,
      bags: 2,
      imageKey: 'sedan.png',
      pricePerKm: '13.00',
    },
    {
      name: 'SUV',
      seats: 6,
      bags: 3,
      imageKey: 'suv.png',
      pricePerKm: '20.00',
    },
    {
      name: 'Mini',
      seats: 4,
      bags: 1,
      imageKey: 'mini.png',
      pricePerKm: '10.00',
    },
  ]).onConflictDoNothing();

  console.log('✅  Cab types seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
