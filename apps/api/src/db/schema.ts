import { pgTable, uuid, text, numeric, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Users ─────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  phone: text('phone').unique().notNull(),
  email: text('email').unique(),
  avatarUrl: text('avatar_url'),
  authProvider: text('auth_provider').notNull().default('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Cab Types ─────────────────────────────────────────────────────────────
export const cabTypes = pgTable('cab_types', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),       // 'Sedan' | 'SUV' | 'Mini'
  seats: integer('seats').notNull(),
  bags: integer('bags').notNull(),
  imageKey: text('image_key'),        // asset filename or S3 key
  pricePerKm: numeric('price_per_km', { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Cabs (vendor inventory) ────────────────────────────────────────────────
export const cabs = pgTable('cabs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agencyName: text('agency_name').notNull(),
  cabTypeId: uuid('cab_type_id').references(() => cabTypes.id).notNull(),
  driverName: text('driver_name'),
  driverPhone: text('driver_phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Bookings ──────────────────────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cabId: uuid('cab_id').references(() => cabs.id).notNull(),
  fromLocation: text('from_location').notNull(),
  toLocation: text('to_location').notNull(),
  pickupDatetime: timestamp('pickup_datetime', { withTimezone: true }).notNull(),
  distanceKm: numeric('distance_km', { precision: 8, scale: 2 }),
  totalFare: numeric('total_fare', { precision: 10, scale: 2 }),
  status: text('status').default('pending').notNull(),
  // 'pending' | 'confirmed' | 'completed' | 'cancelled'
  paymentMethod: text('payment_method'),   // 'upi' | 'card' | 'cash'
  paymentStatus: text('payment_status').default('pending').notNull(),
  // 'pending' | 'paid' | 'failed'
  transactionRef: text('transaction_ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── OTPs ───────────────────────────────────────────────────────────────────
export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Type Exports ──────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CabType = typeof cabTypes.$inferSelect;
export type Cab = typeof cabs.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;
