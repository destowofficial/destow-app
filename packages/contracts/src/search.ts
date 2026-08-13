import { z } from 'zod';
import { VEHICLE_CATEGORY } from './enums';

const place = z.string().trim().min(2).max(160);

// Note what is NOT here: distance. The old backend took `distanceKm` from the
// client and multiplied by it, which is how a real cab could be booked for ₹1.
// The server resolves distance itself, every time, for both the quote and the
// booking - so there is no number a client can send that changes a price.
export const searchBody = z.object({
  from: place,
  to: place,
});

export const availableVehiclesBody = z.object({
  from: place,
  to: place,
  // The listing has to price the same journey the booking will. Quoting the
  // direct route while the booking routes via a stop shows one number and
  // charges another.
  stops: z.array(place).max(3).default([]),
  // Narrow the listing to cars or buses. Omitted means both.
  category: z.enum(VEHICLE_CATEGORY).optional(),
});

// Distance is integer metres and money is integer paise, end to end - the same
// units the database stores, so nothing is rounded on the way out. `*Display`
// is a preformatted string so every client renders ₹ identically instead of
// each reimplementing Indian digit grouping.
export interface RouteQuote {
  from: string;
  to: string;
  distanceM: number;
  durationS: number;
}

export interface AvailableVehicle {
  vehicleId: string;
  vehicleTypeName: string;
  category: (typeof VEHICLE_CATEGORY)[number];
  seats: number;
  bags: number;
  modelName: string | null;
  amenities: unknown;
  pricePerKmPaise: number;
  totalFarePaise: number;
  totalFareDisplay: string;
  providerId: string;
  providerName: string;
  providerRatingAvg: number | null;
  providerRatingCount: number;
}

export type SearchBody = z.infer<typeof searchBody>;
export type AvailableVehiclesBody = z.infer<typeof availableVehiclesBody>;
