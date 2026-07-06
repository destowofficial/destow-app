// Shared enum value sets - the single source of truth used by:
//   - the DB (Drizzle pgEnum)         e.g. pgEnum('booking_status', BOOKING_STATUS)
//   - request/response validation     e.g. z.enum(BOOKING_STATUS)
//   - clients (typed unions)          e.g. BookingStatus
// Keep these in sync with no DB migration drift by importing them everywhere.

export const USER_ROLE = ['customer', 'provider', 'admin'] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const CUSTOMER_TYPE = ['individual', 'business'] as const;
export type CustomerType = (typeof CUSTOMER_TYPE)[number];

export const PROVIDER_STATUS = ['pending', 'approved', 'suspended'] as const;
export type ProviderStatus = (typeof PROVIDER_STATUS)[number];

export const VEHICLE_CATEGORY = ['car', 'bus'] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORY)[number];

export const VEHICLE_STATUS = ['pending', 'approved'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[number];

export const DRIVER_STATUS = ['active', 'inactive'] as const;
export type DriverStatus = (typeof DRIVER_STATUS)[number];

export const BOOKING_STATUS = [
  'pending',
  'confirmed',
  'assigned',
  'ongoing',
  'completed',
  'cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export const PAYMENT_STATUS = ['pending', 'paid', 'refunded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_METHOD = ['upi', 'card', 'cash', 'netbanking'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const TRIP_TYPE = ['one_way', 'round_trip'] as const;
export type TripType = (typeof TRIP_TYPE)[number];
