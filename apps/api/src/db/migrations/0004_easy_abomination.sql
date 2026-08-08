CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"customer_type" "customer_type" DEFAULT 'individual' NOT NULL,
	"company_name" text,
	"gstin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_uidx" ON "customers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "customer_type";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "company_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "gstin";