import { describe, it, expect } from 'bun:test';
import { computeRefund } from './refund';

const POLICY = { freeHours: 24, feeBps: 2500 }; // 25% inside 24h
const at = (h: number) => new Date(Date.UTC(2026, 0, 10, 12) + h * 3_600_000);
const PICKUP = at(0);

describe('computeRefund', () => {
  it('refunds everything outside the free window', () => {
    const r = computeRefund({
      totalFarePaise: 556_400, pickupAt: PICKUP, cancelledAt: at(-48), policy: POLICY,
    });
    expect(r.withinFreeWindow).toBe(true);
    expect(r.refundPaise).toBe(556_400);
    expect(r.cancellationFeePaise).toBe(0);
  });

  // The boundary is inclusive: cancelling exactly on the line is free, because
  // the customer who read "24 hours" and acted on it should not be charged.
  it('treats exactly the boundary as free', () => {
    const r = computeRefund({
      totalFarePaise: 100_000, pickupAt: PICKUP, cancelledAt: at(-24), policy: POLICY,
    });
    expect(r.withinFreeWindow).toBe(true);
    expect(r.refundPaise).toBe(100_000);
  });

  it('retains the fee inside the window', () => {
    const r = computeRefund({
      totalFarePaise: 100_000, pickupAt: PICKUP, cancelledAt: at(-1), policy: POLICY,
    });
    expect(r.withinFreeWindow).toBe(false);
    expect(r.cancellationFeePaise).toBe(25_000);
    expect(r.refundPaise).toBe(75_000);
  });

  // The fee compensates the partner for holding a vehicle. Destow earns on
  // completed trips, and this trip never ran.
  it('gives the whole fee to the partner and nothing to Destow', () => {
    const r = computeRefund({
      totalFarePaise: 100_000, pickupAt: PICKUP, cancelledAt: at(-1), policy: POLICY,
    });
    expect(r.providerPayoutPaise).toBe(25_000);
    expect(r.commissionPaise).toBe(0);
  });

  // Money that does not reconcile is worse than money a paisa off in one
  // direction, so the refund is derived by subtraction rather than rounded too.
  it('always reconciles to the fare, including at awkward amounts', () => {
    for (const fare of [1, 3, 7, 99, 101, 12_345, 556_400, 999_999]) {
      for (const bps of [1, 2500, 3333, 9999]) {
        const r = computeRefund({
          totalFarePaise: fare, pickupAt: PICKUP, cancelledAt: at(-1), policy: { freeHours: 24, feeBps: bps },
        });
        expect(r.refundPaise + r.cancellationFeePaise).toBe(fare);
        expect(r.refundPaise).toBeGreaterThanOrEqual(0);
        expect(r.cancellationFeePaise).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // A late cancellation must never bill more than was paid.
  it('never retains more than the fare', () => {
    const r = computeRefund({
      totalFarePaise: 1000, pickupAt: PICKUP, cancelledAt: at(-1), policy: { freeHours: 24, feeBps: 20_000 },
    });
    expect(r.cancellationFeePaise).toBe(1000);
    expect(r.refundPaise).toBe(0);
  });

  // Cancelling after the pickup time is still inside the window, not outside it.
  it('treats a cancellation after pickup as late, not free', () => {
    const r = computeRefund({
      totalFarePaise: 100_000, pickupAt: PICKUP, cancelledAt: at(2), policy: POLICY,
    });
    expect(r.withinFreeWindow).toBe(false);
    expect(r.cancellationFeePaise).toBe(25_000);
  });

  it('honours a zero-fee policy', () => {
    const r = computeRefund({
      totalFarePaise: 100_000, pickupAt: PICKUP, cancelledAt: at(-1), policy: { freeHours: 24, feeBps: 0 },
    });
    expect(r.refundPaise).toBe(100_000);
    expect(r.cancellationFeePaise).toBe(0);
  });
});
