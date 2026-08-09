ALTER TABLE "bookings" ADD COLUMN "estimated_fare_paise" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "odometer_start_km" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "odometer_end_km" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "actual_distance_m" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "distance_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "distance_confirmed_at" timestamp with time zone;