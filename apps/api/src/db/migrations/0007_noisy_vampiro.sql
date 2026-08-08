-- When the vehicle is free again. Added nullable, backfilled, then made NOT
-- NULL, because an existing table cannot take a NOT NULL column with no default.
ALTER TABLE "bookings" ADD COLUMN "occupied_until" timestamp with time zone;--> statement-breakpoint
-- Existing rows predate the concept. A round trip is held until the customer
-- brings it back; anything else gets a conservative 12-hour outstation window.
UPDATE "bookings"
   SET "occupied_until" = COALESCE("return_datetime", "pickup_datetime" + interval '12 hours')
 WHERE "occupied_until" IS NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "occupied_until" SET NOT NULL;--> statement-breakpoint
-- Two customers must not hold the same vehicle for overlapping dates. An
-- application-level "check then insert" loses to a race: two concurrent requests
-- both read no conflict and both write one. This is the only formulation the
-- database itself enforces, so the race is removed rather than narrowed.
--
-- btree_gist is required to combine an equality operator (vehicle_id) with the
-- range overlap operator in a single GiST index.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
-- If this ALTER fails with "could not create exclusion constraint", the table
-- already contains real double-bookings. That is not a migration bug to work
-- around: two customers are holding one car for the same dates and a human has
-- to decide who keeps it. Resolve or cancel the conflicting rows, then re-run.
--
-- Only live bookings reserve the vehicle: a cancelled trip frees it immediately
-- and a completed one is in the past. '[)' is half-open on purpose, so a trip
-- ending at 14:00 and one starting at 14:00 do not overlap.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_vehicle_overlap"
  EXCLUDE USING gist (
    "vehicle_id" WITH =,
    tstzrange("pickup_datetime", "occupied_until", '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'assigned', 'ongoing'));
