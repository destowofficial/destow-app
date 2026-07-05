import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  kmToMetres,
  metresToKm,
  clampCommissionBps,
  formatPaise,
  MIN_COMMISSION_BPS,
  MAX_COMMISSION_BPS,
} from './money';

describe('money', () => {
  it('converts rupees↔paise with correct rounding', () => {
    expect(rupeesToPaise(12.5)).toBe(1250);
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0)).toBe(0);
    expect(paiseToRupees(1250)).toBe(12.5);
  });

  it('converts km↔metres', () => {
    expect(kmToMetres(305)).toBe(305_000);
    expect(kmToMetres(305.4)).toBe(305_400);
    expect(metresToKm(305_000)).toBe(305);
  });

  it('clamps commission bps to the 15–20% business range', () => {
    expect(clampCommissionBps(1000)).toBe(MIN_COMMISSION_BPS);
    expect(clampCommissionBps(2500)).toBe(MAX_COMMISSION_BPS);
    expect(clampCommissionBps(1800)).toBe(1800);
    expect(clampCommissionBps(1500)).toBe(1500);
    expect(clampCommissionBps(2000)).toBe(2000);
  });

  it('formats integer paise as an INR string', () => {
    expect(formatPaise(381_250)).toBe('₹3,812.50');
    expect(formatPaise(100)).toBe('₹1.00');
    expect(formatPaise(0)).toBe('₹0.00');
  });
});
