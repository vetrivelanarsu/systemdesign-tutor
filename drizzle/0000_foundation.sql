CREATE EXTENSION IF NOT EXISTS "vector";--> statement-breakpoint
CREATE TYPE "public"."accountability_tone" AS ENUM('supportive', 'direct', 'off');--> statement-breakpoint
CREATE TABLE "study_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"timezone" text NOT NULL,
	"accountability_tone" "accountability_tone" DEFAULT 'direct' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_settings_singleton" CHECK ("study_settings"."id" = 1)
);
