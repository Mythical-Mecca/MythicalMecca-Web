-- Quests are strictly event-bound ------------------------------------------
-- Nothing on the site shows a quest without its event, and venue checks
-- measure from the event's coordinates. Verified 0 orphan rows before writing
-- this, so the NOT NULL needs no backfill. The old ON DELETE SET NULL is
-- replaced by CASCADE: it created exactly the orphan this now forbids.
ALTER TABLE "scavenger_hunts" DROP CONSTRAINT IF EXISTS "scavenger_hunts_event_id_events_id_fk";--> statement-breakpoint
DELETE FROM "scavenger_hunts" WHERE "event_id" IS NULL;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD CONSTRAINT "scavenger_hunts_event_id_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- How the trail may be walked ----------------------------------------------
ALTER TABLE "scavenger_hunts" ADD COLUMN IF NOT EXISTS "sequential" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Optional prerequisite, for free-order quests ------------------------------
ALTER TABLE "hunt_steps" ADD COLUMN IF NOT EXISTS "parent_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hunt_steps" ADD CONSTRAINT "hunt_steps_parent_id_hunt_steps_id_fk"
   FOREIGN KEY ("parent_id") REFERENCES "public"."hunt_steps"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Only public events have a public URL --------------------------------------
-- A draft has no page to address. `status` stays the single source of truth
-- for visibility; the slug simply follows it. Uniqueness is unaffected —
-- Postgres allows many NULLs in a unique index.
ALTER TABLE "events" ALTER COLUMN "slug" DROP NOT NULL;
