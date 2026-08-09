import type { TripType } from '@destow/contracts';
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
  // The distance actually charged for. For a round trip that is both legs, so
  // it is not the same as the one-way route distance.
  distanceM: number;
  pricePerKmPaise: number;
  totalFarePaise: number;
  commissionBps: number;
  commissionPaise: number;
  providerPayoutPaise: number;
}

// The single place fare + commission are computed. Pure, integer-paise, server-side.
// total_fare   = price_per_km * distance
// commission   = total_fare * commission_rate   (rate clamped to 15-20%)
// payout       = total_fare - commission
export function computeFare(params: {
  pricePerKmPaise: number;
  distanceM: number;
  commissionBps: number;
  tripType?: TripType;
}): FareBreakdown {
  const { pricePerKmPaise } = params;

  // A round trip drives the route twice. Charging the one-way distance made the
  // partner cover the return leg for free - on a Delhi-Manali return that is
  // roughly 430 km of fuel and a day of the driver's time, unpaid.
  const distanceM =
    params.tripType === 'round_trip' ? params.distanceM * 2 : params.distanceM;
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
