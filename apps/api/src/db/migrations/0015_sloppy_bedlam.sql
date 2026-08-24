ALTER TABLE "bookings" ADD COLUMN "stops" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pickup_address" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pickup_lat" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pickup_lng" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "drop_address" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "drop_lat" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "drop_lng" double precision;