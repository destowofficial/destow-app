import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { existsSync } from 'node:fs';
import { db } from './connection.js';
import { cabTypes, cabs } from './schema.js';

let bootstrapPromise: Promise<void> | null = null;

export function ensureDatabaseReady() {
  bootstrapPromise ??= bootstrapDatabase();
  return bootstrapPromise;
}

async function bootstrapDatabase() {
  await migrate(db, { migrationsFolder: getMigrationsFolder() });
  await seedDefaultInventory();
}

function getMigrationsFolder() {
  if (existsSync('src/db/migrations/meta/_journal.json')) return 'src/db/migrations';
  if (existsSync('dist/db/migrations/meta/_journal.json')) return 'dist/db/migrations';
  return 'src/db/migrations';
}

async function seedDefaultInventory() {
  const existingCabTypes = await db.select({ id: cabTypes.id }).from(cabTypes).limit(1);
  if (existingCabTypes.length === 0) {
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
    ]);
  }

  const existingCabs = await db.select({ id: cabs.id }).from(cabs).limit(1);
  if (existingCabs.length > 0) return;

  const seededCabTypes = await db.select().from(cabTypes);
  const sedan = seededCabTypes.find((type) => type.name === 'Sedan');
  const suv = seededCabTypes.find((type) => type.name === 'SUV');
  const mini = seededCabTypes.find((type) => type.name === 'Mini');

  const defaultCabs = [
    sedan && {
      agencyName: 'Kutra Travels',
      cabTypeId: sedan.id,
      driverName: 'Amit Sharma',
      driverPhone: '9000000001',
      isActive: true,
    },
    suv && {
      agencyName: 'Kummi Travels',
      cabTypeId: suv.id,
      driverName: 'Ravi Kumar',
      driverPhone: '9000000002',
      isActive: true,
    },
    mini && {
      agencyName: 'Destow Partner',
      cabTypeId: mini.id,
      driverName: 'Sanjay Verma',
      driverPhone: '9000000003',
      isActive: true,
    },
  ].filter((cab): cab is NonNullable<typeof cab> => Boolean(cab));

  if (defaultCabs.length > 0) {
    await db.insert(cabs).values(defaultCabs);
  }
}
