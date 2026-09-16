ALTER TABLE "player_signups" DROP CONSTRAINT "player_signups_hunt_id_scavenger_hunts_id_fk";
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "signup_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "signup_label" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "signup_blurb" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "signup_webhook_secret" text;--> statement-breakpoint
-- Carry over what 0009 put on the quest, so an event whose quest already had a
-- form keeps its link and its webhook address. One quest per event in practice;
-- if there were several, the newest wins.
UPDATE "events" e SET
  "signup_url" = h."signup_url",
  "signup_label" = h."signup_label",
  "signup_blurb" = h."signup_blurb",
  "signup_webhook_secret" = h."signup_webhook_secret"
FROM (
  SELECT DISTINCT ON ("event_id") "event_id", "signup_url", "signup_label", "signup_blurb", "signup_webhook_secret"
  FROM "scavenger_hunts"
  WHERE "signup_webhook_secret" IS NOT NULL
  ORDER BY "event_id", "updated_at" DESC
) h
WHERE h."event_id" = e."id";--> statement-breakpoint
ALTER TABLE "player_signups" DROP COLUMN "hunt_id";--> statement-breakpoint
ALTER TABLE "scavenger_hunts" DROP COLUMN "signup_url";--> statement-breakpoint
ALTER TABLE "scavenger_hunts" DROP COLUMN "signup_label";--> statement-breakpoint
ALTER TABLE "scavenger_hunts" DROP COLUMN "signup_blurb";--> statement-breakpoint
ALTER TABLE "scavenger_hunts" DROP COLUMN "signup_webhook_secret";