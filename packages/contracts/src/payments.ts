import { z } from 'zod';
import { PAYMENT_METHOD } from './enums';

// What the client hands back after the gateway checkout. The amount is
// deliberately absent: it comes from the fare frozen on the booking.
export const confirmPaymentBody = z.object({
  orderId: z.string().min(4).max(120),
  paymentId: z.string().min(4).max(120),
  signature: z.string().min(16).max(256),
  method: z.enum(PAYMENT_METHOD).optional(),
});

export type ConfirmPaymentBody = z.infer<typeof confirmPaymentBody>;
