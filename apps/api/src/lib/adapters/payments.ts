import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import {
  externalRequestDuration,
  externalRequestsTotal,
  observeAsync,
  recordPaymentEvent,
} from '../metrics/metrics.js';

// Razorpay's real shape, not a wishful one: a server cannot charge a card. It
// creates an Order, the customer completes it in the checkout, and the client
// hands back a signature the server verifies. Modelling this as charge() would
// have meant rewriting every caller the day real keys arrived.
//
//   createOrder  -> customer pays in the checkout -> verifyPayment
//                                                 \-> or a webhook, if the app
//                                                     never came back
export interface PaymentOrder {
  orderId: string;
  amountPaise: number;
  // The publishable key the client needs to open the checkout. Never the secret.
  keyId: string;
}

export interface PaymentSignature {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundResult {
  refundId: string;
  amountPaise: number;
}

// A mandate is standing permission to charge after a trip. Setting one up takes
// no money: the customer authorises a ceiling, and what comes back is a token.
export interface MandateAuthorisation {
  // The order the client opens the authorisation sheet against.
  orderId: string;
  keyId: string;
  // The gateway's handle for this customer, needed to charge later.
  customerRef: string;
}

export interface MandateSignature {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface MandateCharge {
  paymentId: string;
  amountPaise: number;
}

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: { bookingId: string; amountPaise: number }): Promise<PaymentOrder>;
  // Partial refunds are the norm here, not the exception: a late cancellation
  // returns the fare minus the fee retained for the partner, so the amount is
  // always explicit rather than implied to be the whole payment.
  refund(input: { paymentId: string; amountPaise: number }): Promise<RefundResult>;
  // Whether this really came from the gateway. The whole integrity of the
  // payment flow is this one boolean: without it a client could simply claim it
  // paid, which is the money equivalent of sending your own fare.
  verifyPayment(sig: PaymentSignature): boolean;
  verifyWebhook(rawBody: string, signature: string): boolean;

  // --- Mandates ------------------------------------------------------------
  // Open an authorisation for a standing permission to charge. Takes no money.
  authoriseMandate(input: {
    userId: string;
    maxAmountPaise: number;
    method: 'upi' | 'card';
  }): Promise<MandateAuthorisation>;
  // Whether the customer really approved that authorisation. Same construction
  // as verifyPayment, and the same reason: without it a client could claim an
  // authorisation it never obtained and hand us a token of its choosing.
  verifyMandate(sig: MandateSignature): boolean;
  // Charge an approved mandate. This runs with nobody watching, after the trip,
  // which is exactly why the amount is always computed server-side.
  chargeMandate(input: {
    token: string;
    customerRef: string;
    amountPaise: number;
    bookingId: string;
  }): Promise<MandateCharge>;
}

// Constant-time compare over hex digests of equal length. A plain === leaks,
// through timing, how much of a forged signature was correct.
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false; // not hex at all
  }
}

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Razorpay. Signature verification is implemented for real here, because it is
// pure HMAC and needs no network - so the security-critical half of this
// integration is exercised by tests long before live keys exist. Order creation
// is the half that genuinely needs the API.
class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';

  async createOrder(input: { bookingId: string; amountPaise: number }): Promise<PaymentOrder> {
    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'razorpay', operation: 'create_order' },
      async () => {
        throw new Error(
          'RazorpayProvider.createOrder not implemented - POST https://api.razorpay.com/v1/orders',
        );
      },
    );
  }

  async refund(_input: { paymentId: string; amountPaise: number }): Promise<RefundResult> {
    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'razorpay', operation: 'refund' },
      async () => {
        throw new Error('RazorpayProvider.refund not implemented - POST /v1/payments/:id/refund');
      },
    );
  }

  async authoriseMandate(_input: {
    userId: string;
    maxAmountPaise: number;
    method: 'upi' | 'card';
  }): Promise<MandateAuthorisation> {
    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'razorpay', operation: 'authorise_mandate' },
      async () => {
        throw new Error(
          'RazorpayProvider.authoriseMandate not implemented - POST /v1/customers then ' +
            'POST /v1/orders with token.max_amount for a zero-value authorisation',
        );
      },
    );
  }

  // The authorisation is signed exactly like a payment, so this is the same
  // construction and needs no network - the security-critical half is testable
  // long before live keys exist.
  verifyMandate({ orderId, paymentId, signature }: MandateSignature): boolean {
    const expected = hmacHex(env.RAZORPAY_KEY_SECRET ?? '', `${orderId}|${paymentId}`);
    return safeEqualHex(expected, signature);
  }

  async chargeMandate(_input: {
    token: string;
    customerRef: string;
    amountPaise: number;
    bookingId: string;
  }): Promise<MandateCharge> {
    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'razorpay', operation: 'charge_mandate' },
      async () => {
        throw new Error(
          'RazorpayProvider.chargeMandate not implemented - POST /v1/orders then ' +
            'POST /v1/payments/create/recurring with the saved token',
        );
      },
    );
  }

  // Razorpay signs "<order_id>|<payment_id>" with the key secret.
  verifyPayment({ orderId, paymentId, signature }: PaymentSignature): boolean {
    const expected = hmacHex(env.RAZORPAY_KEY_SECRET ?? '', `${orderId}|${paymentId}`);
    return safeEqualHex(expected, signature);
  }

  // Webhooks are signed over the exact raw body, so it must not be re-serialized
  // before reaching here - a re-encoded JSON object will not verify.
  verifyWebhook(rawBody: string, signature: string): boolean {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    // Refuse rather than fall back to ''. HMAC with an empty key is something
    // any attacker can compute, so defaulting turns verification into theatre.
    // parseEnv already refuses to boot in this state; this is the second lock.
    if (!secret) {
      console.error('[payments] webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured');
      return false;
    }
    return safeEqualHex(hmacHex(secret, rawBody), signature);
  }
}

// Dev: deterministic, and signed with the same HMAC construction as the real
// thing so the verification path under test is the production one. A stub that
// returned `true` would leave the only security-critical branch untested.
const STUB_SECRET = 'destow-stub-payment-secret';

class StubPaymentProvider implements PaymentProvider {
  readonly name = 'stub';

  async createOrder(input: { bookingId: string; amountPaise: number }): Promise<PaymentOrder> {
    const order = await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'stub', operation: 'create_order' },
      async () => ({
        orderId: `order_stub_${input.bookingId.replace(/-/g, '').slice(0, 20)}`,
        amountPaise: input.amountPaise,
        keyId: 'rzp_test_stub',
      }),
    );
    recordPaymentEvent('stub', 'upi', 'created');
    return order;
  }

  async refund(input: { paymentId: string; amountPaise: number }): Promise<RefundResult> {
    const result = await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'stub', operation: 'refund' },
      async () => ({ refundId: `rfnd_stub_${input.paymentId}`, amountPaise: input.amountPaise }),
    );
    recordPaymentEvent('stub', 'upi', 'refunded');
    return result;
  }

  verifyPayment({ orderId, paymentId, signature }: PaymentSignature): boolean {
    return safeEqualHex(hmacHex(STUB_SECRET, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    return safeEqualHex(hmacHex(STUB_SECRET, rawBody), signature);
  }

  async authoriseMandate(input: {
    userId: string;
    maxAmountPaise: number;
    method: 'upi' | 'card';
  }): Promise<MandateAuthorisation> {
    const auth = await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'stub', operation: 'authorise_mandate' },
      async () => ({
        orderId: `order_mand_${input.userId.replace(/-/g, '').slice(0, 18)}`,
        keyId: 'rzp_test_stub',
        customerRef: `cust_stub_${input.userId.replace(/-/g, '').slice(0, 14)}`,
      }),
    );
    recordPaymentEvent('stub', input.method, 'mandate_authorised');
    return auth;
  }

  verifyMandate({ orderId, paymentId, signature }: MandateSignature): boolean {
    return safeEqualHex(hmacHex(STUB_SECRET, `${orderId}|${paymentId}`), signature);
  }

  async chargeMandate(input: {
    token: string;
    customerRef: string;
    amountPaise: number;
    bookingId: string;
  }): Promise<MandateCharge> {
    const charge = await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'stub', operation: 'charge_mandate' },
      async () => ({
        paymentId: `pay_auto_${input.bookingId.replace(/-/g, '').slice(0, 16)}`,
        amountPaise: input.amountPaise,
      }),
    );
    recordPaymentEvent('stub', 'upi', 'mandate_charged');
    return charge;
  }
}

// Exposed for the same reason stubSignature is: tests and local clients need to
// produce an approval the stub accepts, exercising the code path a real
// gateway's signature takes rather than a shortcut around it.
export function stubMandateSignature(orderId: string, paymentId: string): string {
  return hmacHex(STUB_SECRET, `${orderId}|${paymentId}`);
}

// Exposed so tests (and local clients) can produce a signature the stub accepts,
// exercising the same code path a real gateway's signature takes.
export function stubSignature(orderId: string, paymentId: string): string {
  return hmacHex(STUB_SECRET, `${orderId}|${paymentId}`);
}

export function stubWebhookSignature(rawBody: string): string {
  return hmacHex(STUB_SECRET, rawBody);
}

// Builds a webhook body in the shape Razorpay sends, so tests exercise the same
// parsing and reconciliation a real event will.
export function stubWebhookBody(input: {
  orderId: string;
  paymentId: string;
  amountPaise: number;
  status?: string;
}): string {
  return JSON.stringify({
    payload: {
      payment: {
        entity: {
          id: input.paymentId,
          order_id: input.orderId,
          amount: input.amountPaise,
          status: input.status ?? 'captured',
        },
      },
    },
  });
}

export const payments: PaymentProvider =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new RazorpayProvider()
    : new StubPaymentProvider();
