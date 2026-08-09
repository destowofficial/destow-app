import { z } from 'zod';
import { TRIP_TYPE, BOOKING_STATUS, PAYMENT_STATUS, CUSTOMER_PAYMENT_METHOD } from './enums';

// What a customer sends to book. Note what is absent: distance, price, fare.
// The server resolves the vehicle, routes the distance and computes the
// estimate itself. There is no number here that reaches money.
//
// Destow sells outstation round trips only - the vehicle and driver stay with
// the customer for the whole trip and bring them back - so a return date is
// required rather than optional. `tripType` survives as a literal so the column
// and every historic row keep their meaning, but one_way is not bookable.
export const createBookingBody = z
  .object({
    vehicleId: z.string().uuid(),
    from: z.string().trim().min(2).max(160),
    to: z.string().trim().min(2).max(160),
    pickupDatetime: z.coerce.date(),
    tripType: z.literal('round_trip').default('round_trip'),
    returnDatetime: z.coerce.date(),
  })
  .refine((b) => b.pickupDatetime.getTime() > Date.now(), {
    path: ['pickupDatetime'],
    message: 'Pickup must be in the future',
  })
  // A return before pickup is a data-entry error that would otherwise sit in
  // the booking silently until a driver turned up on the wrong day. It also
  // sets occupied_until, so a bad value corrupts vehicle availability.
  .refine((b) => b.returnDatetime.getTime() > b.pickupDatetime.getTime(), {
    path: ['returnDatetime'],
    message: 'Return must be after pickup',
  });

// What a partner submits when the vehicle comes back, and the only input that
// decides what the customer is charged.
//
// Two readings rather than one "kilometres run" total: a single figure is a box
// a driver can type anything into, whereas two odometer readings can be checked
// against each other, against the routed estimate, and - crucially - shown to
// the customer to verify before any money moves.
export const submitOdometerBody = z
  .object({
    odometerStartKm: z.number().int().min(0).max(9_999_999),
    odometerEndKm: z.number().int().min(0).max(9_999_999),
  })
  .refine((b) => b.odometerEndKm > b.odometerStartKm, {
    path: ['odometerEndKm'],
    message: 'The closing reading must be higher than the opening one',
  });

export const listBookingsQuery = z.object({
  status: z.enum(BOOKING_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// The customer's view of their own booking. Commission and payout are absent by
// design: the customer pays total_fare, and what Destow takes from the partner
// is a term between us and them.
export interface CustomerBooking {
  id: string;
  status: (typeof BOOKING_STATUS)[number];
  paymentStatus: (typeof PAYMENT_STATUS)[number];
  from: string;
  to: string;
  // The routed distance for the round trip, resolved at booking. This is the
  // estimate the quote was built from, not what the customer is billed for.
  distanceM: number;
  tripType: (typeof TRIP_TYPE)[number];
  pickupDatetime: string;
  returnDatetime: string | null;
  pricePerKmPaise: number;
  // How this trip was settled. Null until it is paid: the choice is made at the
  // end, on the payment screen, not when the trip is booked.
  paymentMethod: (typeof CUSTOMER_PAYMENT_METHOD)[number] | null;
  // What this booking currently costs: the estimate until the distance is
  // confirmed, the recomputed figure afterwards. Payments reconcile against it.
  totalFarePaise: number;
  totalFareDisplay: string;
  // The original quote, frozen and never rewritten, so "quoted vs charged" can
  // always be shown - including when the two differ, which is the normal case.
  estimatedFarePaise: number;
  estimatedFareDisplay: string;
  // --- Set when the partner submits the odometer, null until the trip ends ---
  odometerStartKm: number | null;
  odometerEndKm: number | null;
  actualDistanceM: number | null;
  distanceSubmittedAt: string | null;
  // Set when the customer approves that distance. Nothing is charged before it.
  distanceConfirmedAt: string | null;
  // --- Cancellation outcome, null until a trip is called off ----------------
  cancelledAt: string | null;
  cancelledBy: string | null;
  // What was retained and what went back, frozen at cancellation so a later
  // policy change never rewrites a settled trip.
  cancellationFeePaise: number | null;
  refundPaise: number | null;
  vehicleTypeName: string;
  modelName: string | null;
  registrationNo: string | null;
  providerName: string;
  // Shared only once a driver is assigned - before that there is nobody to name.
  driverName: string | null;
  driverPhone: string | null;
  createdAt: string;
}

// What cancelling right now would cost this customer. Computed per booking
// rather than exposed as a global policy: the answer depends on this trip's
// pickup time and its own fare, and a screen that has to derive the number from
// a policy will derive it differently from the server sooner or later.
//
// Under postpaid billing nothing has been paid when a trip is called off, so the
// fee is a charge rather than a deduction from a refund. Saying which of the two
// is happening is the whole point of showing this before they commit.
export interface CancellationPreview {
  bookingId: string;
  // False once the trip is running or finished - the API refuses it, and the
  // screen should not offer a button that cannot work.
  cancellable: boolean;
  isFree: boolean;
  // When free cancellation closes for this trip. Already past if isFree is false.
  freeUntil: string;
  freeHours: number;
  feeBps: number;
  cancellationFeePaise: number;
  cancellationFeeDisplay: string;
  // Zero in the normal postpaid case, because nothing was taken. Non-zero only
  // where a payment was captured out of band and has to come back.
  refundPaise: number;
  refundDisplay: string;
  alreadyPaid: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type CreateBookingBody = z.infer<typeof createBookingBody>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;
export type SubmitOdometerBody = z.infer<typeof submitOdometerBody>;
