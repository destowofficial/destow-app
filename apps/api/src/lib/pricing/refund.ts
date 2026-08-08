import { BPS_DIVISOR } from './money.js';

export interface RefundPolicy {
  // Cancel more than this many hours before pickup and nothing is retained.
  freeHours: number;
  // Retained inside that window, in basis points of the fare.
  feeBps: number;
}

export interface RefundBreakdown {
  refundPaise: number;
  cancellationFeePaise: number;
  // What the partner keeps for holding the vehicle. The whole fee: Destow takes
  // no commission on a trip that never ran, because commission accrues on
  // completion. Charging for a cancellation would be earning on nothing.
  providerPayoutPaise: number;
  commissionPaise: number;
  withinFreeWindow: boolean;
}

// Pure: given a fare, a pickup time and a policy, decide who gets what. Kept
// free of the database and the clock so the arithmetic is testable on its own -
// this is the second place in the system where money is decided, and the first
// (computeFare) earned its unit tests.
export function computeRefund(params: {
  totalFarePaise: number;
  pickupAt: Date;
  cancelledAt: Date;
  policy: RefundPolicy;
}): RefundBreakdown {
  const { totalFarePaise, pickupAt, cancelledAt, policy } = params;

  const hoursToPickup = (pickupAt.getTime() - cancelledAt.getTime()) / 3_600_000;
  const withinFreeWindow = hoursToPickup >= policy.freeHours;

  if (withinFreeWindow) {
    return {
      refundPaise: totalFarePaise,
      cancellationFeePaise: 0,
      providerPayoutPaise: 0,
      commissionPaise: 0,
      withinFreeWindow: true,
    };
  }

  // Round the fee, then derive the refund by subtraction, so the two always sum
  // to exactly what was paid. Rounding both independently can lose or invent a
  // paisa, and money that does not reconcile is worse than money that is a
  // paisa off in one direction.
  const cancellationFeePaise = Math.min(
    totalFarePaise,
    Math.round((totalFarePaise * policy.feeBps) / BPS_DIVISOR),
  );

  return {
    refundPaise: totalFarePaise - cancellationFeePaise,
    cancellationFeePaise,
    providerPayoutPaise: cancellationFeePaise,
    commissionPaise: 0,
    withinFreeWindow: false,
  };
}
