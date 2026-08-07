CREATE TYPE "public"."otp_channel" AS ENUM('whatsapp', 'telegram', 'log');--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "otp_channels" "otp_channel"[] DEFAULT ARRAY['log']::otp_channel[] NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "otp_default_channel" "otp_channel" DEFAULT 'log' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "otp_fallback_channel" "otp_channel";