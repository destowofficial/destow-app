import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import {
  vehicles,
  vehicleTypes,
  serviceProviders,
  bookings,
  platformSettings,
} from '../../db/schema.js';
import type { Booking } from '../../db/schema.js';
import { computeFare } from '../../lib/pricing.js';
import { paiseToRupees, kmToMetres } from '../../lib/money.js';
import { AppError } from '../../lib/errors.js';

const DEFAULT_COMMISSION_BPS = 1800;

async function platformCommissionBps(): Promise<number> {
  const [s] = await db
    .select({ bps: platformSettings.commissionBps })
    .from(platformSettings)
    .limit(1);
  return s?.bps ?? DEFAULT_COMMISSION_BPS;
}

// Internal booking row → mobile-compatible response (money in ₹, distance in km).
function toBookingResponse(b: Booking) {
  return {
    id: b.id,
    userId: b.customerUserId,
    cabId: b.vehicleId,
    fromLocation: b.fromLocation,
    toLocation: b.toLocation,
    pickupDatetime: b.pickupDatetime,
    distanceKm: b.distanceM / 1000,
    totalFare: paiseToRupees(b.totalFarePaise),
    status: b.status,
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
  };
}

export async function getAvailableCabs(from: string, to: string, distanceKm: number) {
  const platformBps = await platformCommissionBps();
  const distanceM = kmToMetres(distanceKm);

  const rows = await db
    .select({
      vehicleId: vehicles.id,
      pricePerKmPaise: vehicles.pricePerKmPaise,
      agencyName: serviceProviders.agencyName,
      providerCommission: serviceProviders.commissionBpsOverride,
      typeName: vehicleTypes.name,
      seats: vehicleTypes.seats,
      bags: vehicleTypes.bags,
      imageKey: vehicleTypes.imageKey,
      category: vehicleTypes.category,
    })
    .from(vehicles)
    .innerJoin(vehicleTypes, eq(vehicles.vehicleTypeId, vehicleTypes.id))
    .innerJoin(serviceProviders, eq(vehicles.serviceProviderId, serviceProviders.id))
    .where(
      and(
        eq(vehicles.isActive, true),
        eq(vehicles.status, 'approved'),
        eq(serviceProviders.status, 'approved'),
      ),
    );

  return rows.map((r) => {
    const fare = computeFare({
      pricePerKmPaise: r.pricePerKmPaise,
      distanceM,
      commissionBps: r.providerCommission ?? platformBps,
    });
    return {
      id: r.vehicleId,
      agencyName: r.agencyName,
      driverName: null, // driver assigned at confirmation
      driverAvailable: false,
      cabType: {
        name: r.typeName,
        seats: r.seats,
        bags: r.bags,
        imageKey: r.imageKey,
        category: r.category,
      },
      pricePerKm: paiseToRupees(r.pricePerKmPaise),
      totalFare: paiseToRupees(fare.totalFarePaise),
      distanceKm,
      from,
      to,
    };
  });
}

export async function bookCab(params: {
  userId: string;
  cabId: string; // vehicle id
  from: string;
  to: string;
  pickupDatetime: string;
  distanceKm: number;
  paymentMethod: 'upi' | 'card' | 'cash';
}) {
  const { userId, cabId, from, to, pickupDatetime, distanceKm, paymentMethod } = params;

  const [vehicle] = await db
    .select({
      id: vehicles.id,
      providerId: vehicles.serviceProviderId,
      typeId: vehicles.vehicleTypeId,
      pricePerKmPaise: vehicles.pricePerKmPaise,
      status: vehicles.status,
      isActive: vehicles.isActive,
      providerCommission: serviceProviders.commissionBpsOverride,
    })
    .from(vehicles)
    .innerJoin(serviceProviders, eq(vehicles.serviceProviderId, serviceProviders.id))
    .where(eq(vehicles.id, cabId))
    .limit(1);

  if (!vehicle || vehicle.status !== 'approved' || !vehicle.isActive) {
    throw AppError.notFound('Vehicle not available');
  }

  const commissionBps = vehicle.providerCommission ?? (await platformCommissionBps());
  const distanceM = kmToMetres(distanceKm);
  // Server computes the fare from the vehicle's rate — the client number is never trusted.
  const fare = computeFare({ pricePerKmPaise: vehicle.pricePerKmPaise, distanceM, commissionBps });

  const [booking] = await db
    .insert(bookings)
    .values({
      customerUserId: userId,
      serviceProviderId: vehicle.providerId,
      vehicleId: vehicle.id,
      vehicleTypeId: vehicle.typeId,
      fromLocation: from,
      toLocation: to,
      distanceM,
      pickupDatetime: new Date(pickupDatetime),
      pricePerKmPaise: vehicle.pricePerKmPaise,
      totalFarePaise: fare.totalFarePaise,
      commissionBps: fare.commissionBps,
      commissionPaise: fare.commissionPaise,
      providerPayoutPaise: fare.providerPayoutPaise,
      status: 'pending',
      paymentMethod,
      paymentStatus: 'pending',
    })
    .returning();

  return toBookingResponse(booking);
}

export async function processPayment(
  userId: string,
  bookingId: string,
  method: 'upi' | 'card' | 'cash',
  transactionRef?: string,
) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerUserId, userId)))
    .limit(1);

  if (!booking) throw AppError.notFound('Booking not found');
  if (booking.paymentStatus === 'paid') throw AppError.conflict('Booking already paid');

  // TODO: real gateway (Razorpay). Atomic conditional update guards a double-pay race.
  const [updated] = await db
    .update(bookings)
    .set({
      paymentMethod: method,
      paymentStatus: 'paid',
      transactionRef: transactionRef ?? `TXN-${Date.now()}`,
      status: 'confirmed',
    })
    .where(and(eq(bookings.id, bookingId), ne(bookings.paymentStatus, 'paid')))
    .returning();

  if (!updated) throw AppError.conflict('Booking already paid');
  return toBookingResponse(updated);
}
