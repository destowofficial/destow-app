import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

// Integration test: runs the generated migration against the isolated docker
// test DB (compose db-test, 5435) and exercises the marketplace schema.
const uniquePhone = () =>
  '+91' + String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 1000));

describe('marketplace schema', () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    await pool.query(
      'TRUNCATE bookings, ratings, drivers, vehicles, vehicle_types, service_providers, platform_settings, otps, users RESTART IDENTITY CASCADE',
    );
  });
  afterAll(async () => {
    await pool.end();
  });

  it('persists a customer→provider→vehicle→booking chain with integer-paise money', async () => {
    const [customer] = await db
      .insert(schema.users)
      .values({ name: 'Test Customer', phone: uniquePhone() })
      .returning();
    const [owner] = await db
      .insert(schema.users)
      .values({ name: 'Agency Owner', phone: uniquePhone(), role: 'provider' })
      .returning();
    const [provider] = await db
      .insert(schema.serviceProviders)
      .values({ ownerUserId: owner.id, agencyName: 'Test Travels', status: 'approved' })
      .returning();
    const [vtype] = await db
      .insert(schema.vehicleTypes)
      .values({ category: 'car', name: 'Sedan', seats: 4, bags: 2 })
      .returning();
    const [vehicle] = await db
      .insert(schema.vehicles)
      .values({
        serviceProviderId: provider.id,
        vehicleTypeId: vtype.id,
        pricePerKmPaise: 1250, // ₹12.50/km
        status: 'approved',
      })
      .returning();
    const [booking] = await db
      .insert(schema.bookings)
      .values({
        customerUserId: customer.id,
        serviceProviderId: provider.id,
        vehicleId: vehicle.id,
        vehicleTypeId: vtype.id,
        fromLocation: 'Delhi',
        toLocation: 'Manali',
        distanceM: 305_000, // 305 km
        pickupDatetime: new Date(),
        pricePerKmPaise: 1250,
        totalFarePaise: 381_250, // 1250 * 305000/1000
        commissionBps: 1800,
        commissionPaise: 68_625, // 381250 * 1800/10000
        providerPayoutPaise: 312_625,
      })
      .returning();

    // enum defaults applied
    expect(booking.status).toBe('pending');
    expect(booking.paymentStatus).toBe('pending');
    // money is a real integer (number), not a numeric string
    expect(booking.totalFarePaise).toBe(381_250);
    expect(typeof booking.totalFarePaise).toBe('number');
    expect(booking.commissionPaise + booking.providerPayoutPaise).toBe(booking.totalFarePaise);

    // relational query resolves across the graph
    const full = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, booking.id),
      with: { customer: true, provider: true, vehicle: true, vehicleType: true },
    });
    expect(full?.customer.id).toBe(customer.id);
    expect(full?.provider.agencyName).toBe('Test Travels');
    expect(full?.vehicle.pricePerKmPaise).toBe(1250);
    expect(full?.vehicleType.category).toBe('car');
  });

  it('enforces the unique phone constraint', async () => {
    const phone = uniquePhone();
    await db.insert(schema.users).values({ name: 'First', phone });
    await expect(db.insert(schema.users).values({ name: 'Dup', phone })).rejects.toThrow();
  });

  it('rejects an invalid enum value at the DB level', async () => {
    await expect(
      pool.query(`insert into vehicle_types (category, name, seats, bags) values ('plane','X',1,1)`),
    ).rejects.toThrow();
  });
});
