import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import {
  USER_ROLE,
  USER_STATUS,
  CUSTOMER_TYPE,
  PROVIDER_STATUS,
  VEHICLE_CATEGORY,
  VEHICLE_STATUS,
  DRIVER_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  TRIP_TYPE,
  CLIENT,
  OTP_CHANNEL,
} from '@destow/contracts';

// --- Enums (values are the single source of truth in @destow/contracts) -------
export const userRoleEnum = pgEnum('user_role', USER_ROLE);
export const userStatusEnum = pgEnum('user_status', USER_STATUS);
export const customerTypeEnum = pgEnum('customer_type', CUSTOMER_TYPE);
export const providerStatusEnum = pgEnum('provider_status', PROVIDER_STATUS);
export const vehicleCategoryEnum = pgEnum('vehicle_category', VEHICLE_CATEGORY);
export const vehicleStatusEnum = pgEnum('vehicle_status', VEHICLE_STATUS);
export const driverStatusEnum = pgEnum('driver_status', DRIVER_STATUS);
export const bookingStatusEnum = pgEnum('booking_status', BOOKING_STATUS);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUS);
export const paymentMethodEnum = pgEnum('payment_method', PAYMENT_METHOD);
export const tripTypeEnum = pgEnum('trip_type', TRIP_TYPE);
export const clientEnum = pgEnum('client', CLIENT);
export const otpChannelEnum = pgEnum('otp_channel', OTP_CHANNEL);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// --- Users (customers, providers, admins) -------------------------------------
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    phone: text('phone').unique().notNull(),
    email: text('email').unique(),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('customer'),
    status: userStatusEnum('status').notNull().default('active'),
    authProvider: text('auth_provider').notNull().default('phone'),
    ...timestamps,
  },
  (t) => [index('users_role_idx').on(t.role)],
);

// --- Customers (the users module's own table) ---------------------------------
// users is the identity: one row per person, the login anchor every session and
// booking points at. This table is the customer-side profile hanging off it, and
// only the users module reads or writes it. A row exists once someone actually
// has customer data to store (B2B details); an individual customer needs none,
// so absence means "individual, nothing extra".
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    customerType: customerTypeEnum('customer_type').notNull().default('individual'),
    companyName: text('company_name'), // B2B
    gstin: text('gstin'), // B2B
    ...timestamps,
  },
  (t) => [uniqueIndex('customers_user_uidx').on(t.userId)],
);

// --- Admins (the admin module's own table) ------------------------------------
// Password material lives here, never on `users`: that row is read on every
// login and refresh, so a hash sitting on it would ride along in any `select *`.
// Customers and providers have no row here at all, which is what makes "most
// accounts have no password" structural rather than a nullable column every
// query has to remember to check.
export const admins = pgTable(
  'admins',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    passwordHash: text('password_hash').notNull(), // argon2id
    passwordUpdatedAt: timestamp('password_updated_at', { withTimezone: true }),
    // Password-step lockout, separate from the OTP attempt counter: clearing one
    // must not clear the other, or a single factor gates both.
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('admins_user_uidx').on(t.userId)],
);

// --- Service providers (agencies / fleet owners) ------------------------------
export const serviceProviders = pgTable(
  'service_providers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    ownerUserId: uuid('owner_user_id').references(() => users.id).notNull(),
    agencyName: text('agency_name').notNull(),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    gstin: text('gstin'),
    status: providerStatusEnum('status').notNull().default('pending'),
    payoutMethod: text('payout_method'), // 'bank' | 'upi'
    payoutDetails: jsonb('payout_details'),
    commissionBpsOverride: integer('commission_bps_override'), // null -> platform default
    ratingSum: integer('rating_sum').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('providers_owner_idx').on(t.ownerUserId),
    index('providers_status_idx').on(t.status),
  ],
);

// --- Vehicle types (catalog: Sedan/SUV/Mini/Tempo/AC-Sleeper...) ----------------
export const vehicleTypes = pgTable(
  'vehicle_types',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    category: vehicleCategoryEnum('category').notNull(),
    name: text('name').notNull(),
    seats: integer('seats').notNull(),
    bags: integer('bags').notNull(),
    imageKey: text('image_key'),
    refPricePerKmPaise: integer('ref_price_per_km_paise'), // reference only
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('vehicle_types_category_idx').on(t.category)],
);

// --- Vehicles (provider inventory) --------------------------------------------
export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    serviceProviderId: uuid('service_provider_id').references(() => serviceProviders.id).notNull(),
    vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
    registrationNo: text('registration_no'),
    modelName: text('model_name'),
    pricePerKmPaise: integer('price_per_km_paise').notNull(), // provider's actual rate
    amenities: jsonb('amenities'),
    status: vehicleStatusEnum('status').notNull().default('pending'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('vehicles_provider_idx').on(t.serviceProviderId),
    index('vehicles_type_idx').on(t.vehicleTypeId),
    index('vehicles_available_idx').on(t.status, t.isActive), // availability listing
  ],
);

// --- Drivers (provider roster; details snapshotted onto a booking) ------------
export const drivers = pgTable(
  'drivers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    serviceProviderId: uuid('service_provider_id').references(() => serviceProviders.id).notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    licenseNo: text('license_no'),
    status: driverStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [index('drivers_provider_idx').on(t.serviceProviderId)],
);

// --- Bookings (the core; money in integer paise, distance in integer metres) --
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerUserId: uuid('customer_user_id').references(() => users.id).notNull(),
    serviceProviderId: uuid('service_provider_id').references(() => serviceProviders.id).notNull(),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id).notNull(),
    vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
    driverId: uuid('driver_id').references(() => drivers.id),
    driverName: text('driver_name'), // snapshot at assignment
    driverPhone: text('driver_phone'), // snapshot at assignment
    fromLocation: text('from_location').notNull(),
    toLocation: text('to_location').notNull(),
    fromCity: text('from_city'),
    toCity: text('to_city'),
    distanceM: integer('distance_m').notNull(), // metres
    tripType: tripTypeEnum('trip_type').notNull().default('one_way'),
    pickupDatetime: timestamp('pickup_datetime', { withTimezone: true }).notNull(),
    returnDatetime: timestamp('return_datetime', { withTimezone: true }),
    // -- Fare snapshot (frozen at creation so config changes never rewrite history) --
    pricePerKmPaise: integer('price_per_km_paise').notNull(),
    totalFarePaise: integer('total_fare_paise').notNull(),
    commissionBps: integer('commission_bps').notNull(),
    commissionPaise: integer('commission_paise').notNull(),
    providerPayoutPaise: integer('provider_payout_paise').notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
    paymentMethod: paymentMethodEnum('payment_method'),
    transactionRef: text('transaction_ref'),
    // Commission accrues on completion, so this is the date the revenue belongs
    // to. createdAt is when the trip was booked, which can be months earlier and
    // is the wrong answer for a monthly statement.
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: text('cancelled_by'), // 'customer' | 'provider'
    ...timestamps,
  },
  (t) => [
    // history listing for a customer (keyset/limit pagination)
    index('bookings_customer_created_idx').on(t.customerUserId, t.createdAt),
    // provider's incoming/active bookings
    index('bookings_provider_status_idx').on(t.serviceProviderId, t.status),
    index('bookings_vehicle_idx').on(t.vehicleId),
    index('bookings_status_idx').on(t.status),
    index('bookings_payment_status_idx').on(t.paymentStatus),
  ],
);

// --- Platform settings (single row; admin-managed commission etc.) ------------
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  commissionBps: integer('commission_bps').notNull().default(1800), // 18%, clamp 1500-2000
  mapsProvider: text('maps_provider').notNull().default('google'),
  // --- OTP delivery, admin-controlled ----------------------------------------
  // Which channels are live, and which is preferred. Credentials stay in env;
  // this row only decides what is switched on, so an admin can change provider
  // without a redeploy. A channel whose credentials are absent is ignored when
  // the registry is built, and the admin API must refuse to enable one.
  otpChannels: otpChannelEnum('otp_channels')
    .array()
    .notNull()
    .default(sql`ARRAY['log']::otp_channel[]`),
  otpDefaultChannel: otpChannelEnum('otp_default_channel').notNull().default('log'),
  // Tried when the default errors at send time. Null = no fallback.
  otpFallbackChannel: otpChannelEnum('otp_fallback_channel'),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Ratings (one per booking; feeds provider rating) -------------------------
export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
    customerUserId: uuid('customer_user_id').references(() => users.id).notNull(),
    serviceProviderId: uuid('service_provider_id').references(() => serviceProviders.id).notNull(),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id),
    rating: integer('rating').notNull(), // 1-5 (enforced in app)
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('ratings_booking_uidx').on(t.bookingId),
    index('ratings_provider_idx').on(t.serviceProviderId),
  ],
);

// --- OTPs (hardened: hashed code, attempt counter, indexed phone) -------------
export const otps = pgTable(
  'otps',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('otps_phone_expires_idx').on(t.phone, t.expiresAt)],
);

// --- Sessions (one row per device login; Postgres is the durable source of -----
// truth for revocation, Redis is a hot-path cache/denylist rebuilt from here). --
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    deviceId: text('device_id'), // client-supplied stable id (optional)
    deviceName: text('device_name'),
    platform: text('platform'), // 'android' | 'ios' | 'web'
    // Which app this session belongs to. rotateRefresh re-mints the access token
    // and needs the audience; the refresh request itself cannot be trusted to
    // declare it. Existing rows predate the three-client split, hence the default.
    client: clientEnum('client').notNull().default('customer_app'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'), // 'logout' | 'logout_all' | 'reuse_detected' | 'banned'
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    index('sessions_active_idx').on(t.userId, t.revokedAt),
  ],
);

// --- Refresh tokens (rotating chain per session; only the hash is stored). ------
// Reuse of an already-used token => theft => revoke the whole session family. ---
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    tokenHash: text('token_hash').notNull(), // sha256(opaque token)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }), // set when rotated; reuse after this = theft
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_uidx').on(t.tokenHash),
    index('refresh_tokens_session_idx').on(t.sessionId),
  ],
);

// --- Auth audit trail (login / refresh / logout / revoke / reuse-detected) ------
export const authEvents = pgTable(
  'auth_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id'),
    event: text('event').notNull(), // 'otp_requested' | 'login' | 'refresh' | 'logout' | 'logout_all' | 'reuse_detected'
    ip: text('ip'),
    userAgent: text('user_agent'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('auth_events_user_idx').on(t.userId, t.createdAt)],
);

// --- Relations (for relational queries / joins) -------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(bookings),
  providerProfile: one(serviceProviders, {
    fields: [users.id],
    references: [serviceProviders.ownerUserId],
  }),
}));

export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  owner: one(users, { fields: [serviceProviders.ownerUserId], references: [users.id] }),
  vehicles: many(vehicles),
  drivers: many(drivers),
  bookings: many(bookings),
}));

export const vehicleTypesRelations = relations(vehicleTypes, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [vehicles.serviceProviderId],
    references: [serviceProviders.id],
  }),
  type: one(vehicleTypes, { fields: [vehicles.vehicleTypeId], references: [vehicleTypes.id] }),
}));

export const driversRelations = relations(drivers, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [drivers.serviceProviderId],
    references: [serviceProviders.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  customer: one(users, { fields: [bookings.customerUserId], references: [users.id] }),
  provider: one(serviceProviders, {
    fields: [bookings.serviceProviderId],
    references: [serviceProviders.id],
  }),
  vehicle: one(vehicles, { fields: [bookings.vehicleId], references: [vehicles.id] }),
  vehicleType: one(vehicleTypes, {
    fields: [bookings.vehicleTypeId],
    references: [vehicleTypes.id],
  }),
  driver: one(drivers, { fields: [bookings.driverId], references: [drivers.id] }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  booking: one(bookings, { fields: [ratings.bookingId], references: [bookings.id] }),
  provider: one(serviceProviders, {
    fields: [ratings.serviceProviderId],
    references: [serviceProviders.id],
  }),
}));

// --- Inferred types -----------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type NewServiceProvider = typeof serviceProviders.$inferInsert;
export type VehicleType = typeof vehicleTypes.$inferSelect;
export type NewVehicleType = typeof vehicleTypes.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;

// --- Customer relations -------------------------------------------------------
export const customersRelations = relations(customers, ({ one }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
}));

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
