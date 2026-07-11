import { describe, it, expect } from 'bun:test';
import { computeFare } from './pricing';

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
