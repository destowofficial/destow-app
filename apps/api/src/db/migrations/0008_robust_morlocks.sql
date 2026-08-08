ALTER TABLE "bookings" ADD COLUMN "payment_order_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_payment_order_uidx" ON "bookings" USING btree ("payment_order_id");