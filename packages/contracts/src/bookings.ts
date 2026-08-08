import { z } from 'zod';
import { TRIP_TYPE, BOOKING_STATUS, PAYMENT_STATUS } from './enums';

// What a customer sends to book. Note what is absent: distance, price, fare.
// The server resolves the vehicle, re-resolves the distance and recomputes the
// fare, then freezes the result. There is no number here that reaches money.
export const createBookingBody = z
  .object({
    vehicleId: z.string().uuid(),
    from: z.string().trim().min(2).max(160),
    to: z.string().trim().min(2).max(160),
    pickupDatetime: z.coerce.date(),
    tripType: z.enum(TRIP_TYPE).default('one_way'),
    returnDatetime: z.coerce.date().optional(),
  })
  .refine((b) => b.pickupDatetime.getTime() > Date.now(), {
    path: ['pickupDatetime'],
    message: 'Pickup must be in the future',
  })
  // A round trip with no return date is not a round trip, and a return before
  // pickup is a data-entry error that would otherwise sit in the booking
  // silently until a driver turned up on the wrong day.
  .refine((b) => b.tripType !== 'round_trip' || b.returnDatetime !== undefined, {
    path: ['returnDatetime'],
    message: 'A round trip needs a return date',
  })
  .refine(
    (b) => b.returnDatetime === undefined || b.returnDatetime.getTime() > b.pickupDatetime.getTime(),
    { path: ['returnDatetime'], message: 'Return must be after pickup' },
  );

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
  distanceM: number;
  tripType: (typeof TRIP_TYPE)[number];
  pickupDatetime: string;
  returnDatetime: string | null;
  pricePerKmPaise: number;
  totalFarePaise: number;
  totalFareDisplay: string;
  vehicleTypeName: string;
  modelName: string | null;
  registrationNo: string | null;
  providerName: string;
  // Shared only once a driver is assigned - before that there is nobody to name.
  driverName: string | null;
  driverPhone: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type CreateBookingBody = z.infer<typeof createBookingBody>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;
