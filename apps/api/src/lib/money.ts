// Money is stored & computed in integer paise; distance in integer metres.
// These helpers convert/format at the edges so no float math ever touches money.

export const RUPEE_PAISE = 100;
export const BPS_DIVISOR = 10_000;
export const MIN_COMMISSION_BPS = 1500; // 15%
export const MAX_COMMISSION_BPS = 2000; // 20%

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * RUPEE_PAISE);
}

export function paiseToRupees(paise: number): number {
  return paise / RUPEE_PAISE;
}

export function kmToMetres(km: number): number {
  return Math.round(km * 1000);
}

export function metresToKm(metres: number): number {
  return metres / 1000;
}

// Commission rate (basis points) is always clamped to the business range 15–20%.
export function clampCommissionBps(bps: number): number {
  return Math.min(MAX_COMMISSION_BPS, Math.max(MIN_COMMISSION_BPS, Math.round(bps)));
}

// Format integer paise as an INR string, e.g. 381250 → "₹3,812.50".
export function formatPaise(paise: number): string {
  const rupees = paise / RUPEE_PAISE;
  return (
    '₹' +
    rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}
