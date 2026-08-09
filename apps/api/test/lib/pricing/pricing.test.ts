import { describe, it, expect } from 'bun:test';
import { computeFare } from '@/lib/pricing/pricing';

describe('computeFare', () => {
  it('computes fare, commission and payout in integer paise', () => {
    const f = computeFare({ pricePerKmPaise: 1250, distanceM: 305_000, commissionBps: 1800 });
    expect(f.totalFarePaise).toBe(381_250);
    expect(f.commissionPaise).toBe(68_625);
    expect(f.providerPayoutPaise).toBe(312_625);
    expect(f.commissionPaise + f.providerPayoutPaise).toBe(f.totalFarePaise);
  });

  it('clamps commission to the 15-20% range', () => {
    expect(computeFare({ pricePerKmPaise: 1000, distanceM: 100_000, commissionBps: 500 }).commissionBps).toBe(1500);
    expect(computeFare({ pricePerKmPaise: 1000, distanceM: 100_000, commissionBps: 9000 }).commissionBps).toBe(2000);
  });
});

describe('round trips', () => {
  // A round trip drives the route twice. Charging the one-way distance made the
  // partner cover the return leg for free - on a Delhi-Manali return that is
  // roughly 430 km of fuel and a day of the driver's time, unpaid.
  it('charges both legs', () => {
    const oneWay = computeFare({ pricePerKmPaise: 1300, distanceM: 200_000, commissionBps: 1800 });
    const round = computeFare({
      pricePerKmPaise: 1300, distanceM: 200_000, commissionBps: 1800, tripType: 'round_trip',
    });
    expect(round.totalFarePaise).toBe(oneWay.totalFarePaise * 2);
    expect(round.distanceM).toBe(400_000);
  });

  it('defaults to one way when no trip type is given', () => {
    const implicit = computeFare({ pricePerKmPaise: 1000, distanceM: 100_000, commissionBps: 1800 });
    const explicit = computeFare({
      pricePerKmPaise: 1000, distanceM: 100_000, commissionBps: 1800, tripType: 'one_way',
    });
    expect(implicit.totalFarePaise).toBe(explicit.totalFarePaise);
  });

  // Commission is a share of the fare, so doubling the fare doubles it too.
  it('takes commission on the whole round trip', () => {
    const round = computeFare({
      pricePerKmPaise: 1300, distanceM: 200_000, commissionBps: 1800, tripType: 'round_trip',
    });
    expect(round.commissionPaise + round.providerPayoutPaise).toBe(round.totalFarePaise);
    expect(round.commissionPaise).toBe(Math.round((round.totalFarePaise * 1800) / 10_000));
  });
});

describe('fare bounds', () => {
  // Money columns are int4. A fare above that wraps negative and the booking
  // ends up owing the customer money, so it must fail rather than truncate.
  it('refuses a route long enough to overflow the fare column', () => {
    expect(() =>
      computeFare({ pricePerKmPaise: 100_000, distanceM: 9_000_000, commissionBps: 1800 }),
    ).toThrow();
  });

  it('accepts the longest realistic Indian outstation route', () => {
    // ~3000 km at the Rs1000/km ceiling - far above anything real, still fine.
    const fare = computeFare({
      pricePerKmPaise: 100_000, distanceM: 3_000_000, commissionBps: 1800,
    });
    expect(fare.totalFarePaise).toBeLessThan(2_147_483_647);
    expect(fare.commissionPaise + fare.providerPayoutPaise).toBe(fare.totalFarePaise);
  });

  // A round trip doubles the distance, so the bound has to survive that too.
  it('applies the bound after doubling a round trip', () => {
    expect(() =>
      computeFare({
        pricePerKmPaise: 100_000, distanceM: 4_000_000, commissionBps: 1800, tripType: 'round_trip',
      }),
    ).toThrow();
  });
});
