ALTER TABLE "users" DROP CONSTRAINT "users_firebase_uid_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "auth_provider" SET DEFAULT 'phone';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "firebase_uid";