-- Event origins (hosted/partner/external/community), community moderation
-- columns, and "interested" marks for external events. Hand-authored:
-- drizzle-kit snapshots lag behind since 0008 (see that file's note).
-- NOTE: ADD VALUE'd enum values must not be used by statements in this same
-- migration — keep any backfills in a later migration.

ALTER TYPE "public"."event_status" ADD VALUE 'pending';--> statement-breakpoint
ALTER TYPE "public"."event_status" ADD VALUE 'rejected';--> statement-breakpoint

CREATE TYPE "public"."event_origin" AS ENUM('hosted', 'partner', 'external', 'community');--> statement-breakpoint

ALTER TABLE "events" ADD COLUMN "origin" "public"."event_origin" DEFAULT 'hosted' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_origin_status_idx" ON "events" USING btree ("origin","status");--> statement-breakpoint
CREATE INDEX "events_partner_idx" ON "events" USING btree ("partner_id");--> statement-breakpoint

CREATE TABLE "event_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "event_interests" ADD CONSTRAINT "event_interests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_interests" ADD CONSTRAINT "event_interests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_interests_unique" ON "event_interests" USING btree ("event_id","user_id");
