CREATE TYPE "public"."claim_mode" AS ENUM('live_code', 'sealed_tag', 'open_tag');--> statement-breakpoint
CREATE TYPE "public"."claim_outcome" AS ENUM('ok', 'duplicate', 'bad_code', 'out_of_range', 'not_open', 'unknown_step');--> statement-breakpoint
CREATE TYPE "public"."reveal_mode" AS ENUM('direct', 'clue');--> statement-breakpoint
CREATE TABLE "hunt_claim_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid,
	"user_id" text,
	"outcome" "claim_outcome" NOT NULL,
	"claim_mode" "claim_mode",
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hunt_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"station_key" text NOT NULL,
	"rotation_seconds" integer DEFAULT 60 NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hunt_stations_step_id_unique" UNIQUE("step_id")
);
--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD COLUMN "location_hint" text;--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD COLUMN "reveal_mode" "reveal_mode" DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD COLUMN "claim_mode" "claim_mode" DEFAULT 'live_code' NOT NULL;--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD COLUMN "claim_radius_m" integer;--> statement-breakpoint
ALTER TABLE "hunt_claim_attempts" ADD CONSTRAINT "hunt_claim_attempts_step_id_hunt_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."hunt_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_claim_attempts" ADD CONSTRAINT "hunt_claim_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_stations" ADD CONSTRAINT "hunt_stations_step_id_hunt_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."hunt_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hunt_claim_attempts_step_idx" ON "hunt_claim_attempts" USING btree ("step_id","created_at");--> statement-breakpoint
CREATE INDEX "hunt_claim_attempts_user_idx" ON "hunt_claim_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD CONSTRAINT "hunt_steps_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;