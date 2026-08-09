import { and, count, desc, eq, sql } from 'drizzle-orm';
import type {
  AvailableVehicle,
  City,
  PopularRoute,
  RouteQuote,
  VehicleCategory,
} from '@destow/contracts';
import { db } from '../../db/connection.js';
import {
  vehicles,
  vehicleTypes,
  serviceProviders,
  platformSettings,
  cities,
  bookings,
} from '../../db/schema.js';
import { resolveDistance } from '../../lib/adapters/route.js';
import { computeFare, roundTripDistanceM } from '../../lib/pricing/pricing.js';
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

// A customer choosing a car does not scroll past a few dozen, but pricing every
// vehicle in the catalogue costs a fare computation each and grows without
// bound as partners onboard. Cap the work, and report the true total so a
// truncated list is visible rather than silently passed off as everything.
const MAX_LISTED_VEHICLES = 50;

export async function listAvailableVehicles(
  from: string,
  to: string,
  category?: VehicleCategory,
): Promise<{
  route: RouteQuote;
  vehicles: AvailableVehicle[];
  totalAvailable: number;
  truncated: boolean;
}> {
  const route = await searchRoute(from, to);
  const defaultBps = await platformCommissionBps();

  // Three gates, all required for a vehicle to be sellable: the partner is
  // approved, the vehicle is approved, and the vehicle is currently active. A
  // pending provider's fleet must never appear, which is what makes admin
  // approval mean something.
  const where = and(
    eq(serviceProviders.status, 'approved'),
    eq(vehicles.status, 'approved'),
    eq(vehicles.isActive, true),
    category ? eq(vehicleTypes.category, category) : undefined,
  );

  // Counted separately so the cap never misreports how much is actually on
  // offer; counting is cheap, pricing is not.
  const [{ totalAvailable }] = await db
    .select({ totalAvailable: count() })
    .from(vehicles)
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, vehicles.vehicleTypeId))
    .innerJoin(serviceProviders, eq(serviceProviders.id, vehicles.serviceProviderId))
    .where(where);

  const rows = await db
    .select({
      vehicle: vehicles,
      type: vehicleTypes,
      provider: serviceProviders,
    })
    .from(vehicles)
    .innerJoin(vehicleTypes, eq(vehicleTypes.id, vehicles.vehicleTypeId))
    .innerJoin(serviceProviders, eq(serviceProviders.id, vehicles.serviceProviderId))
    .where(where)
    // Cheapest first is also the useful set to keep when capping.
    .orderBy(vehicles.pricePerKmPaise)
    .limit(MAX_LISTED_VEHICLES);

  const priced = rows.map(({ vehicle, type, provider }): AvailableVehicle => {
    // Same engine the booking will use, with the same inputs, so the quoted
    // estimate and the booked estimate cannot disagree. The doubling matters:
    // quoting the one-way route for a round trip under-quoted by half.
    const fare = computeFare({
      pricePerKmPaise: vehicle.pricePerKmPaise,
      distanceM: roundTripDistanceM(route.distanceM),
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

  return {
    route,
    vehicles: priced,
    totalAvailable,
    truncated: totalAvailable > priced.length,
  };
}

// The admin-managed catalog a partner picks from when listing a vehicle, and a
// customer filters by. Read-only here; the catalog itself is seeded.
export async function listVehicleTypes() {
  return db
    .select({
      id: vehicleTypes.id,
      category: vehicleTypes.category,
      name: vehicleTypes.name,
      seats: vehicleTypes.seats,
      bags: vehicleTypes.bags,
      refPricePerKmPaise: vehicleTypes.refPricePerKmPaise,
    })
    .from(vehicleTypes)
    .orderBy(vehicleTypes.category, vehicleTypes.name);
}

// The curated from/to list. Free text would let "Bangalore" and "Bengaluru"
// become two routes, two Distance Matrix calls and two different fares for one
// journey - so the app picks from here rather than typing.
export async function listCities(): Promise<City[]> {
  return db
    .select({ id: cities.id, name: cities.name, state: cities.state })
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(cities.name);
}

// Observed, not curated: the routes customers actually book. Empty until there
// are bookings, which is honest - a hardcoded list would claim popularity we
// have not seen, and this one improves itself.
export async function listPopularRoutes(limit = 8): Promise<PopularRoute[]> {
  const rows = await db
    .select({
      from: bookings.fromLocation,
      to: bookings.toLocation,
      bookings: count(),
    })
    .from(bookings)
    // Cancelled trips are not demand. Counting them would let one customer
    // book and cancel a route repeatedly to push it up the home screen.
    .where(sql`${bookings.status} <> 'cancelled'`)
    .groupBy(bookings.fromLocation, bookings.toLocation)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({ from: r.from, to: r.to, bookings: r.bookings }));
}
