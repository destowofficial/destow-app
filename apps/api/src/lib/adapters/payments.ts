import { env } from '../../config/env.js';
import type { PaymentMethod } from '@destow/contracts';

export interface ChargeRequest {
  bookingId: string;
  amountPaise: number;
  method: PaymentMethod;
}

export interface ChargeResult {
  transactionRef: string;
  status: 'paid' | 'failed';
}

// Swappable payment gateway (money in integer paise).
export interface PaymentProvider {
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

// Razorpay (RBI-compliant) - wired when keys are present.
class RazorpayProvider implements PaymentProvider {
  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    throw new Error('RazorpayProvider not implemented - set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET');
  }
}

// Dev/stub: deterministic success, no real charge.
class StubPaymentProvider implements PaymentProvider {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    return { transactionRef: `STUB-${req.bookingId}`, status: 'paid' };
  }
}

export const payments: PaymentProvider =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new RazorpayProvider()
    : new StubPaymentProvider();
