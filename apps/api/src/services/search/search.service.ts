import { and, eq } from 'drizzle-orm';
import type { AvailableVehicle, RouteQuote, VehicleCategory } from '@destow/contracts';
import { db } from '../../db/connection.js';
import { vehicles, vehicleTypes, serviceProviders, platformSettings } from '../../db/schema.js';
import { resolveDistance } from '../../lib/adapters/route.js';
import { computeFare } from '../../lib/pricing/pricing.js';
import { formatPaise, clampCommissionBps } from '../../lib/pricing/money.js';

// The customer-facing quote. Distance comes from the maps adapter (cached), and
// the fare from the pricing engine - the client supplies neither.

export async function searchRoute(from: string, to: string): Promise<RouteQuote> {
  const { distanceM, durationS } = await resolveDistance(from, to);
  return { from, to, distanceM, durationS };
}

// Resolved once per listing rather than per vehicle: the platform default is a
// single row, and a provider override only matters for providers actually in the
// result set.
async function platformCommissionBps(): Promise<number> {
  const [row] = await db.select({ bps: platformSettings.commissionBps }).from(platformSettings).limit(1);
  return clampCommissionBps(row?.bps ?? 1800);
}

export async function listAvailableVehicles(
  from: string,
  to: string,
  category?: VehicleCategory,
): Promise<{ route: RouteQuote; vehicles: AvailableVehicle[] }> {
  const route = await searchRoute(from, to);
  const defaultBps = await platformCommissionBps();

  // Three gates, all required for a vehicle to be sellable: the partner is
  // approved, the vehicle is approved, and the vehicle is currently active. A
  // pending provider's fleet must never appear, which is what makes admin
  // approval mean something.
  const rows = await db
    .select({
      vehicle: vehicles,
      type: vehicleTypes,
      provider: serviceProviders,
    })
    .from(vehicles)
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, vehicles.vehicleTypeId))
    .innerJoin(serviceProviders, eq(serviceProviders.id, vehicles.serviceProviderId))
    .where(
      and(
        eq(serviceProviders.status, 'approved'),
        eq(vehicles.status, 'approved'),
        eq(vehicles.isActive, true),
        category ? eq(vehicleTypes.category, category) : undefined,
      ),
    );

  const priced = rows.map(({ vehicle, type, provider }): AvailableVehicle => {
    // Same engine the booking will use, with the same inputs, so the quoted
    // price and the frozen price cannot disagree.
    const fare = computeFare({
      pricePerKmPaise: vehicle.pricePerKmPaise,
      distanceM: route.distanceM,
      commissionBps: provider.commissionBpsOverride ?? defaultBps,
    });

    return {
      vehicleId: vehicle.id,
      vehicleTypeName: type.name,
      category: type.category,
      seats: type.seats,
      bags: type.bags,
      modelName: vehicle.modelName,
      amenities: vehicle.amenities,
      pricePerKmPaise: vehicle.pricePerKmPaise,
      totalFarePaise: fare.totalFarePaise,
      totalFareDisplay: formatPaise(fare.totalFarePaise),
      providerId: provider.id,
      providerName: provider.agencyName,
      providerRatingAvg:
        provider.ratingCount > 0 ? provider.ratingSum / provider.ratingCount : null,
      providerRatingCount: provider.ratingCount,
      // Deliberately absent: commissionPaise and providerPayoutPaise. The
      // customer pays total_fare; what Destow takes from the provider is a
      // commercial term between us and the partner, not a line item on a quote.
    };
  });

  // Cheapest first - the transparent per-km price is the product's whole pitch.
  priced.sort((a, b) => a.totalFarePaise - b.totalFarePaise);

  return { route, vehicles: priced };
}
