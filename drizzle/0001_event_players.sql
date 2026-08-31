CREATE TABLE "event_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"pin_hash" text NOT NULL,
	"failed_pins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "hunt_progress" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "no_data_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hunt_claim_attempts" ADD COLUMN "player_id" uuid;--> statement-breakpoint
ALTER TABLE "hunt_progress" ADD COLUMN "player_id" uuid;--> statement-breakpoint
ALTER TABLE "event_players" ADD CONSTRAINT "event_players_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_players_handle_idx" ON "event_players" USING btree ("event_id",lower("handle"));--> statement-breakpoint
ALTER TABLE "hunt_claim_attempts" ADD CONSTRAINT "hunt_claim_attempts_player_id_event_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."event_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_progress" ADD CONSTRAINT "hunt_progress_player_id_event_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."event_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hunt_progress_player_unique" ON "hunt_progress" USING btree ("step_id","player_id");--> statement-breakpoint
CREATE INDEX "hunt_progress_hunt_player_idx" ON "hunt_progress" USING btree ("hunt_id","player_id");--> statement-breakpoint
ALTER TABLE "hunt_progress" ADD CONSTRAINT "hunt_progress_one_claimant" CHECK (num_nonnulls("hunt_progress"."user_id", "hunt_progress"."player_id") = 1);