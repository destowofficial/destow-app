ALTER TABLE "bookings" ADD COLUMN "refund_paise" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_fee_paise" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refund_ref" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "cancellation_free_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "cancellation_fee_bps" integer DEFAULT 2500 NOT NULL;