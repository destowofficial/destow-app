CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'assigned', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('upi', 'card', 'cash', 'netbanking');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."trip_type" AS ENUM('one_way', 'round_trip');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'provider', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vehicle_category" AS ENUM('car', 'bus');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('pending', 'approved');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"service_provider_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"driver_id" uuid,
	"driver_name" text,
	"driver_phone" text,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"from_city" text,
	"to_city" text,
	"distance_m" integer NOT NULL,
	"trip_type" "trip_type" DEFAULT 'one_way' NOT NULL,
	"pickup_datetime" timestamp with time zone NOT NULL,
	"return_datetime" timestamp with time zone,
	"price_per_km_paise" integer NOT NULL,
	"total_fare_paise" integer NOT NULL,
	"commission_bps" integer NOT NULL,
	"commission_paise" integer NOT NULL,
	"provider_payout_paise" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method",
	"transaction_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_provider_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"license_no" text,
	"status" "driver_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_bps" integer DEFAULT 1800 NOT NULL,
	"maps_provider" text DEFAULT 'google' NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"service_provider_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"agency_name" text NOT NULL,
	"contact_phone" text,
	"contact_email" text,
	"gstin" text,
	"status" "provider_status" DEFAULT 'pending' NOT NULL,
	"payout_method" text,
	"payout_details" jsonb,
	"commission_bps_override" integer,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"customer_type" "customer_type" DEFAULT 'individual' NOT NULL,
	"company_name" text,
	"gstin" text,
	"auth_provider" text DEFAULT 'phone' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "vehicle_category" NOT NULL,
	"name" text NOT NULL,
	"seats" integer NOT NULL,
	"bags" integer NOT NULL,
	"image_key" text,
	"ref_price_per_km_paise" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_provider_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"registration_no" text,
	"model_name" text,
	"price_per_km_paise" integer NOT NULL,
	"amenities" jsonb,
	"status" "vehicle_status" DEFAULT 'pending' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_type_id_vehicle_types_id_fk" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicle_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_vehicle_types_id_fk" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicle_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_customer_created_idx" ON "bookings" USING btree ("customer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_provider_status_idx" ON "bookings" USING btree ("service_provider_id","status");--> statement-breakpoint
CREATE INDEX "bookings_vehicle_idx" ON "bookings" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_payment_status_idx" ON "bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "drivers_provider_idx" ON "drivers" USING btree ("service_provider_id");--> statement-breakpoint
CREATE INDEX "otps_phone_expires_idx" ON "otps" USING btree ("phone","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_booking_uidx" ON "ratings" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ratings_provider_idx" ON "ratings" USING btree ("service_provider_id");--> statement-breakpoint
CREATE INDEX "providers_owner_idx" ON "service_providers" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "providers_status_idx" ON "service_providers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "vehicle_types_category_idx" ON "vehicle_types" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vehicles_provider_idx" ON "vehicles" USING btree ("service_provider_id");--> statement-breakpoint
CREATE INDEX "vehicles_type_idx" ON "vehicles" USING btree ("vehicle_type_id");--> statement-breakpoint
CREATE INDEX "vehicles_available_idx" ON "vehicles" USING btree ("status","is_active");