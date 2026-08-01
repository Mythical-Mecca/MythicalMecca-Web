-- LFG (looking-for-group) session posts + seat membership. Hand-authored:
-- drizzle-kit snapshots lag behind since 0008 (see that file's note).

CREATE TYPE "public"."lfg_join_mode" AS ENUM('open', 'approval');--> statement-breakpoint
CREATE TYPE "public"."lfg_member_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint

CREATE TABLE "lfg_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" text NOT NULL,
	"title" text NOT NULL,
	"game_system" text NOT NULL,
	"description" text,
	"venue_text" text,
	"partner_id" uuid,
	"event_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"total_seats" integer NOT NULL,
	"join_mode" "public"."lfg_join_mode" DEFAULT 'open' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lfg_posts_starts_idx" ON "lfg_posts" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "lfg_posts_host_idx" ON "lfg_posts" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "lfg_posts_event_idx" ON "lfg_posts" USING btree ("event_id");--> statement-breakpoint

CREATE TABLE "lfg_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "public"."lfg_member_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "lfg_members" ADD CONSTRAINT "lfg_members_post_id_lfg_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."lfg_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_members" ADD CONSTRAINT "lfg_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lfg_members_unique" ON "lfg_members" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "lfg_members_user_idx" ON "lfg_members" USING btree ("user_id");
