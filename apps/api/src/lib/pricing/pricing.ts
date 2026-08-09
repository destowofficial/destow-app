import { clampCommissionBps, BPS_DIVISOR } from './money.js';
import { AppError } from '../http/errors.js';

// Money columns are int4, so a fare above this cannot be stored - it wraps
// negative and a booking ends up owing the customer money. Nothing legitimate
// approaches it (the longest Indian outstation route at the Rs1000/km ceiling
// is an order of magnitude below), so exceeding it means bad input rather than
// an expensive trip, and it should fail loudly instead of being truncated.
const MAX_FARE_PAISE = 2_000_000_000; // Rs 20,000,000
// ~5000 km. No outstation trip in India is longer; a larger value means the
// maps provider returned something wrong.
const MAX_DISTANCE_M = 5_000_000;

export interface FareBreakdown {
  // The distance charged for, exactly as passed in. Doubling for the return leg
  // happens at the call site, not here - see roundTripDistanceM.
  distanceM: number;
  pricePerKmPaise: number;
  totalFarePaise: number;
  commissionBps: number;
  commissionPaise: number;
  providerPayoutPaise: number;
}

// A route quote gives the distance one way; the vehicle drives it twice. This
// is deliberately a separate step rather than a flag on computeFare: the fare
// is computed twice in a booking's life, once from this doubled estimate and
// once from the odometer, and the odometer figure is *already* both legs.
// A hidden tripType-driven doubling would silently bill the metered trip twice.
export function roundTripDistanceM(oneWayDistanceM: number): number {
  return oneWayDistanceM * 2;
}

// The single place fare + commission are computed. Pure, integer-paise, server-side.
// total_fare   = price_per_km * distance      (distance already chargeable)
// commission   = total_fare * commission_rate (rate clamped to 15-20%)
// payout       = total_fare - commission
export function computeFare(params: {
  pricePerKmPaise: number;
  distanceM: number;
  commissionBps: number;
}): FareBreakdown {
  const { pricePerKmPaise, distanceM } = params;
  const commissionBps = clampCommissionBps(params.commissionBps);
  if (distanceM > MAX_DISTANCE_M) {
    throw AppError.unprocessable('Validation failed', {
      to: ['That route is too long to price'],
    });
  }

  const totalFarePaise = Math.round((pricePerKmPaise * distanceM) / 1000);

  // Belt and braces: the distance cap and the per-km ceiling together keep this
  // well clear, but a fare that cannot be stored must never reach the database.
  if (!Number.isSafeInteger(totalFarePaise) || totalFarePaise > MAX_FARE_PAISE) {
    throw AppError.unprocessable('Validation failed', {
      to: ['That trip is too expensive to book online'],
    });
  }
  const commissionPaise = Math.round((totalFarePaise * commissionBps) / BPS_DIVISOR);
  const providerPayoutPaise = totalFarePaise - commissionPaise;
  return {
    distanceM,
    pricePerKmPaise,
    totalFarePaise,
    commissionBps,
    commissionPaise,
    providerPayoutPaise,
  };
}
