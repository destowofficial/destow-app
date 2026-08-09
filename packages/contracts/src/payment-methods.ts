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

// UPI only. Cash needs no mandate - there is nothing to authorise - and cards
// would mean card data crossing our servers, which is PCI-DSS scope we have no
// reason to take on when UPI is the rail this market actually uses.
//
// The VPA is collected on our own screen rather than in a gateway checkout, so
// the customer never sees another brand's payment sheet. Approval itself still
// happens in their UPI app: NPCI requires the mandate to be approved in the
// payer's own PSP, and no gateway can move that step into our app.
export const setupMandateBody = z.object({
  method: z.literal('upi').default('upi'),
  // name@handle. Deliberately loose on the handle - banks add new ones often,
  // and the gateway is the authority on whether one resolves.
  vpa: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.\-_]{2,64}@[a-z][a-z0-9.\-]{1,64}$/, 'That does not look like a UPI ID'),
});

// What the client needs to open the gateway's authorisation sheet. No charge is
// taken here - the amount is zero and the point is the token that comes back.
export interface MandateSetup {
  mandateId: string;
  orderId: string;
  customerRef: string;
  maxAmountPaise: number;
  provider: string;
  // Where the customer approves it. The mandate request is pushed to their UPI
  // app, so the client's job is to tell them to go and approve it - not to open
  // a checkout.
  vpa: string;
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
