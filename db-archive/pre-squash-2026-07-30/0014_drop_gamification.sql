-- Remove the XP / rank / badge system entirely (to be reintroduced later).
-- Drops the gamification tables, the badge tier enum, and the user-level
-- xp / sync_rate / rank columns. Hunt points (hunt_steps.points,
-- hunt_progress.points_awarded) are per-hunt scores and are kept.

DROP TABLE IF EXISTS "user_badges";--> statement-breakpoint
DROP TABLE IF EXISTS "badges";--> statement-breakpoint
DROP TABLE IF EXISTS "xp_ledger";--> statement-breakpoint
DROP TABLE IF EXISTS "seasons";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."badge_tier";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "xp";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "sync_rate";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "rank";
