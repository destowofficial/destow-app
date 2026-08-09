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

// A dynamic UPI QR raised for one exact amount. The customer scans it in their
// own UPI app and pays; the gateway tells us when the money lands. Nothing is
// stored against the customer and there is no standing permission to charge -
// the QR is the whole authorisation, and it dies with the payment.
export interface UpiQr {
  // The gateway's handle, used to reconcile the webhook back to this booking.
  qrId: string;
  // The UPI payload the client renders as a QR. Any UPI app can read it.
  payload: string;
  amountPaise: number;
  expiresAt: string;
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

  // --- UPI QR --------------------------------------------------------------
  // Raise a QR for exactly what this trip cost. Amount is always server-side:
  // the client asks for a QR for a booking, never for an amount.
  createUpiQr(input: { bookingId: string; amountPaise: number }): Promise<UpiQr>;
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

  async createUpiQr(_input: { bookingId: string; amountPaise: number }): Promise<UpiQr> {
    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'razorpay', operation: 'create_upi_qr' },
      async () => {
        throw new Error(
          'RazorpayProvider.createUpiQr not implemented - POST /v1/payments/qr_codes ' +
            "with type 'upi_qr', usage 'single_use' and a fixed payment_amount. " +
            "Settlement arrives as the 'qr_code.credited' webhook.",
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

// How long a QR stands before it has to be raised again. Short enough that a
// stale code cannot be paid against a fare that has since changed.
const QR_TTL_MS = 15 * 60_000;

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

  async createUpiQr(input: { bookingId: string; amountPaise: number }): Promise<UpiQr> {
    const qr = await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'stub', operation: 'create_upi_qr' },
      async () => {
        const qrId = `qr_stub_${input.bookingId.replace(/-/g, '').slice(0, 18)}`;
        return {
          qrId,
          // The shape a real UPI intent takes, so the client renders something a
          // UPI app would actually accept rather than a placeholder.
          payload:
            `upi://pay?pa=destow@stub&pn=Destow&am=${(input.amountPaise / 100).toFixed(2)}` +
            `&cu=INR&tr=${qrId}`,
          amountPaise: input.amountPaise,
          expiresAt: new Date(Date.now() + QR_TTL_MS).toISOString(),
        };
      },
    );
    recordPaymentEvent('stub', 'upi', 'qr_created');
    return qr;
  }
}


// Exposed so tests (and local clients) can produce a signature the stub accepts,
// exercising the same code path a real gateway's signature takes.
export function stubSignature(orderId: string, paymentId: string): string {
  return hmacHex(STUB_SECRET, `${orderId}|${paymentId}`);
}

export function stubWebhookSignature(rawBody: string): string {
  return hmacHex(STUB_SECRET, rawBody);
}

// Builds a webhook body in the shape a QR credit arrives in, so tests exercise
// the same parsing and reconciliation a real event will. Both entities are
// present because both matter: the payment carries the amount, the QR is what
// ties it back to a booking.
export function stubWebhookBody(input: {
  qrId: string;
  paymentId: string;
  amountPaise: number;
  status?: string;
}): string {
  return JSON.stringify({
    event: 'qr_code.credited',
    payload: {
      qr_code: { entity: { id: input.qrId } },
      payment: {
        entity: {
          id: input.paymentId,
          qr_code_id: input.qrId,
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
