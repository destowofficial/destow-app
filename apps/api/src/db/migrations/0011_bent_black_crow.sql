CREATE INDEX "bookings_vehicle_type_idx" ON "bookings" USING btree ("vehicle_type_id");--> statement-breakpoint
CREATE INDEX "bookings_driver_idx" ON "bookings" USING btree ("driver_id");