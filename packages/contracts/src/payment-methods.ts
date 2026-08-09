import { z } from 'zod';
import { PAYMENT_METHOD, MANDATE_STATUS } from './enums';

// Destow charges after the trip, once the customer has agreed the odometer. That
// only works if there is a standing permission to charge - otherwise a customer
// can confirm the distance and simply never pay, and a cancellation fee is a
// number we record and can never collect.
//
// What is stored is a gateway token, never card data: it authorises charges
// against our own account and is worthless anywhere else.

// The cap the customer agrees to. A mandate has to name a ceiling, and a charge
// above it is refused by the gateway - so this has to clear a long outstation
// round trip with room for the distance running over the estimate.
export const MANDATE_MAX_AMOUNT_PAISE = 20_000_000; // Rs 2,00,000

export const setupMandateBody = z.object({
  method: z.enum(['upi', 'card'] as const).default('upi'),
});

// What the client needs to open the gateway's authorisation sheet. No charge is
// taken here - the amount is zero and the point is the token that comes back.
export interface MandateSetup {
  mandateId: string;
  orderId: string;
  keyId: string;
  customerRef: string;
  maxAmountPaise: number;
  provider: string;
}

export const confirmMandateBody = z.object({
  mandateId: z.string().uuid(),
  orderId: z.string().min(1).max(200),
  paymentId: z.string().min(1).max(200),
  signature: z.string().min(1).max(400),
  // The gateway's handle for future charges. Verified against the signature
  // before it is trusted, so a client cannot supply someone else's token.
  token: z.string().min(1).max(200),
  // Display only - a masked VPA or last four digits.
  label: z.string().trim().max(80).optional(),
});

export interface CustomerPaymentMethod {
  id: string;
  method: (typeof PAYMENT_METHOD)[number];
  status: (typeof MANDATE_STATUS)[number];
  label: string | null;
  maxAmountPaise: number;
  maxAmountDisplay: string;
  isDefault: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export type SetupMandateBody = z.infer<typeof setupMandateBody>;
export type ConfirmMandateBody = z.infer<typeof confirmMandateBody>;
