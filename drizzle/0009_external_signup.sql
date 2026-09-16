CREATE TABLE "player_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"hunt_id" uuid,
	"handle" text NOT NULL,
	"external_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_players" ADD COLUMN "signup_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_players" ADD COLUMN "signup_reminder_dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD COLUMN "signup_url" text;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD COLUMN "signup_label" text;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD COLUMN "signup_blurb" text;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD COLUMN "signup_webhook_secret" text;--> statement-breakpoint
ALTER TABLE "player_signups" ADD CONSTRAINT "player_signups_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_signups" ADD CONSTRAINT "player_signups_hunt_id_scavenger_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."scavenger_hunts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_signups_handle_idx" ON "player_signups" USING btree ("event_id",lower("handle"));