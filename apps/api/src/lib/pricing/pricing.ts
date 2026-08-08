import type { TripType } from '@destow/contracts';
import { clampCommissionBps, BPS_DIVISOR } from './money.js';

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
  const totalFarePaise = Math.round((pricePerKmPaise * distanceM) / 1000);
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
