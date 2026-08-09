import { pathToFileURL } from 'node:url';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { ensureAdminBootstrap } from '../services/admin/admin-bootstrap.service.js';
import { users, serviceProviders, vehicles, vehicleTypes, platformSettings, cities } from './schema.js';

type Db = NodePgDatabase<typeof schema>;

// Idempotent baseline data for local/dev: platform commission + the vehicle-type catalog.
export async function seedDatabase(db: Db): Promise<void> {
  // First admin, if ADMIN_* are set and none exists yet. Idempotent.
  await ensureAdminBootstrap();

  const settings = await db.select({ id: platformSettings.id }).from(platformSettings).limit(1);
  if (settings.length === 0) {
    await db.insert(platformSettings).values({ commissionBps: 1800 }); // 18%
  }

  // The from/to catalogue. Outstation demand concentrates on a handful of
  // corridors, so this is the launch set rather than every Indian city - an
  // admin adds more as routes open.
  const existingCities = await db.select({ id: cities.id }).from(cities).limit(1);
  if (existingCities.length === 0) {
    await db.insert(cities).values([
      { name: 'Delhi', state: 'Delhi' },
      { name: 'Gurugram', state: 'Haryana' },
      { name: 'Noida', state: 'Uttar Pradesh' },
      { name: 'Agra', state: 'Uttar Pradesh' },
      { name: 'Jaipur', state: 'Rajasthan' },
      { name: 'Udaipur', state: 'Rajasthan' },
      { name: 'Jodhpur', state: 'Rajasthan' },
      { name: 'Chandigarh', state: 'Chandigarh' },
      { name: 'Shimla', state: 'Himachal Pradesh' },
      { name: 'Manali', state: 'Himachal Pradesh' },
      { name: 'Dehradun', state: 'Uttarakhand' },
      { name: 'Rishikesh', state: 'Uttarakhand' },
      { name: 'Nainital', state: 'Uttarakhand' },
      { name: 'Amritsar', state: 'Punjab' },
      { name: 'Lucknow', state: 'Uttar Pradesh' },
      { name: 'Varanasi', state: 'Uttar Pradesh' },
      { name: 'Mumbai', state: 'Maharashtra' },
      { name: 'Pune', state: 'Maharashtra' },
      { name: 'Nashik', state: 'Maharashtra' },
      { name: 'Lonavala', state: 'Maharashtra' },
      { name: 'Goa', state: 'Goa' },
      { name: 'Bengaluru', state: 'Karnataka' },
      { name: 'Mysuru', state: 'Karnataka' },
      { name: 'Coorg', state: 'Karnataka' },
      { name: 'Chennai', state: 'Tamil Nadu' },
      { name: 'Pondicherry', state: 'Puducherry' },
      { name: 'Ooty', state: 'Tamil Nadu' },
      { name: 'Hyderabad', state: 'Telangana' },
      { name: 'Ahmedabad', state: 'Gujarat' },
      { name: 'Kolkata', state: 'West Bengal' },
    ]);
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
