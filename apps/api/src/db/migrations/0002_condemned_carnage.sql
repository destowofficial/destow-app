CREATE TYPE "public"."client" AS ENUM('customer_app', 'provider_app', 'admin_web');--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "client" "client" DEFAULT 'customer_app' NOT NULL;