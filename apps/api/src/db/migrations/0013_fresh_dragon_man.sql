CREATE TYPE "public"."mandate_status" AS ENUM('pending', 'active', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text,
	"token" text,
	"method" "payment_method" NOT NULL,
	"label" text,
	"max_amount_paise" integer NOT NULL,
	"status" "mandate_status" DEFAULT 'pending' NOT NULL,
	"auth_payment_id" text,
	"activated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_methods_user_idx" ON "payment_methods" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_one_active_uidx" ON "payment_methods" USING btree ("user_id") WHERE status = 'active';