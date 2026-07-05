import { clampCommissionBps, BPS_DIVISOR } from './money.js';

export interface FareBreakdown {
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
}): FareBreakdown {
  const { pricePerKmPaise, distanceM } = params;
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
