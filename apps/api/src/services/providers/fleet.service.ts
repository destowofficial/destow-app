import { and, eq } from 'drizzle-orm';
import type {
  CreateVehicleBody,
  UpdateVehicleBody,
  CreateDriverBody,
  UpdateDriverBody,
} from '@destow/contracts';
import { db } from '../../db/connection.js';
import { vehicles, vehicleTypes, drivers, serviceProviders } from '../../db/schema.js';
import { AppError } from '../../lib/http/errors.js';
import { canonicalizePhone } from '../../lib/auth/phone.js';

// A partner's own fleet and driver roster. The provider id is always resolved
// from the caller's user id and never read from the request, so there is no
// parameter to tamper with: every query is scoped to the caller's own provider,
// and a row belonging to someone else simply does not match.

async function ownProviderId(userId: string): Promise<string> {
  const [row] = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(eq(serviceProviders.ownerUserId, userId))
    .limit(1);
  if (!row) throw AppError.notFound('No provider profile for this account');
  return row.id;
}

// --- Vehicles -----------------------------------------------------------------

export async function listVehicles(userId: string) {
  const providerId = await ownProviderId(userId);
  return db
    .select({
      id: vehicles.id,
      vehicleTypeId: vehicles.vehicleTypeId,
      vehicleTypeName: vehicleTypes.name,
      category: vehicleTypes.category,
      seats: vehicleTypes.seats,
      bags: vehicleTypes.bags,
      registrationNo: vehicles.registrationNo,
      modelName: vehicles.modelName,
      pricePerKmPaise: vehicles.pricePerKmPaise,
      amenities: vehicles.amenities,
      status: vehicles.status,
      isActive: vehicles.isActive,
      createdAt: vehicles.createdAt,
    })
    .from(vehicles)
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, vehicles.vehicleTypeId))
    .where(eq(vehicles.serviceProviderId, providerId))
    .orderBy(vehicles.createdAt);
}

export async function createVehicle(userId: string, body: CreateVehicleBody) {
  const providerId = await ownProviderId(userId);

  // The catalog is admin-managed, so an unknown type is a client error rather
  // than something to create on the fly.
  const [type] = await db
    .select({ id: vehicleTypes.id })
    .from(vehicleTypes)
    .where(eq(vehicleTypes.id, body.vehicleTypeId))
    .limit(1);
  if (!type) throw AppError.unprocessable('Validation failed', { vehicleTypeId: ['Unknown vehicle type'] });

  // A pending provider may still build out their fleet while they wait - it just
  // never lists, because /vehicles/available requires both to be approved.
  const [created] = await db
    .insert(vehicles)
    .values({
      serviceProviderId: providerId,
      vehicleTypeId: body.vehicleTypeId,
      pricePerKmPaise: body.pricePerKmPaise,
      registrationNo: body.registrationNo,
      modelName: body.modelName,
      amenities: body.amenities,
      status: 'pending', // admin approves before it can be booked
      isActive: true,
    })
    .returning();
  return created;
}

export async function updateVehicle(userId: string, vehicleId: string, body: UpdateVehicleBody) {
  const providerId = await ownProviderId(userId);

  // Scoped by provider as well as id: another partner's vehicle matches zero
  // rows and reads as "not found", which is also the right thing to tell them.
  const [updated] = await db
    .update(vehicles)
    .set({
      ...(body.pricePerKmPaise !== undefined ? { pricePerKmPaise: body.pricePerKmPaise } : {}),
      ...(body.modelName !== undefined ? { modelName: body.modelName } : {}),
      ...(body.amenities !== undefined ? { amenities: body.amenities } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    })
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.serviceProviderId, providerId)))
    .returning();
  if (!updated) throw AppError.notFound('Vehicle not found');

  // Note: a price change does NOT send the vehicle back for approval. Approval
  // is about the vehicle being real and roadworthy, not about its rate - the
  // rate is the partner's commercial decision. Existing bookings are unaffected
  // either way, because their fare is frozen at creation.
  return updated;
}

// --- Drivers ------------------------------------------------------------------

export async function listDrivers(userId: string) {
  const providerId = await ownProviderId(userId);
  return db
    .select()
    .from(drivers)
    .where(eq(drivers.serviceProviderId, providerId))
    .orderBy(drivers.createdAt);
}

export async function createDriver(userId: string, body: CreateDriverBody) {
  const providerId = await ownProviderId(userId);
  const [created] = await db
    .insert(drivers)
    .values({
      serviceProviderId: providerId,
      name: body.name,
      // Same canonicalization as a login phone: a customer will be calling this
      // number, and two spellings of it must not become two drivers.
      phone: canonicalizePhone(body.phone),
      licenseNo: body.licenseNo,
    })
    .returning();
  return created;
}

export async function updateDriver(userId: string, driverId: string, body: UpdateDriverBody) {
  const providerId = await ownProviderId(userId);
  const [updated] = await db
    .update(drivers)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: canonicalizePhone(body.phone) } : {}),
      ...(body.licenseNo !== undefined ? { licenseNo: body.licenseNo } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    })
    .where(and(eq(drivers.id, driverId), eq(drivers.serviceProviderId, providerId)))
    .returning();
  if (!updated) throw AppError.notFound('Driver not found');
  return updated;
}
