import { pathToFileURL } from 'node:url';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { ensureAdminBootstrap } from '../services/admin/admin-bootstrap.service.js';
import { users, serviceProviders, vehicles, vehicleTypes, platformSettings } from './schema.js';

type Db = NodePgDatabase<typeof schema>;

// Idempotent baseline data for local/dev: platform commission + the vehicle-type catalog.
export async function seedDatabase(db: Db): Promise<void> {
  // First admin, if ADMIN_* are set and none exists yet. Idempotent.
  await ensureAdminBootstrap();

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

  // Demo service provider + fleet so /cabs/available returns vehicles in dev.
  const existingProvider = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .limit(1);
  if (existingProvider.length === 0) {
    const allTypes = await db.select().from(vehicleTypes);
    const typeId = (name: string) => allTypes.find((t) => t.name === name)?.id;

    const [owner] = await db
      .insert(users)
      .values({ name: 'Demo Agency Owner', phone: '+919000000001', role: 'provider' })
      .returning();
    const [provider] = await db
      .insert(serviceProviders)
      .values({ ownerUserId: owner.id, agencyName: 'Destow Partner Travels', status: 'approved' })
      .returning();

    const fleet = [
      { type: 'Sedan', pricePerKmPaise: 1300, registrationNo: 'DL01AB1234', modelName: 'Honda City' },
      { type: 'SUV', pricePerKmPaise: 2000, registrationNo: 'DL01AB5678', modelName: 'Toyota Innova' },
      { type: 'Tempo Traveller', pricePerKmPaise: 2500, registrationNo: 'DL01CD9012', modelName: 'Force Traveller' },
    ];
    const rows = fleet
      .map((v) => {
        const vehicleTypeId = typeId(v.type);
        return vehicleTypeId
          ? {
              serviceProviderId: provider.id,
              vehicleTypeId,
              pricePerKmPaise: v.pricePerKmPaise,
              registrationNo: v.registrationNo,
              modelName: v.modelName,
              status: 'approved' as const,
              isActive: true,
            }
          : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    if (rows.length) await db.insert(vehicles).values(rows);
  }
}

// Runs only when executed directly (bun run db:seed), not when imported by tests.
async function run() {
  const { db, pool } = await import('./connection.js');
  await seedDatabase(db);
  console.log('Database seeded');
  await pool.end();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
