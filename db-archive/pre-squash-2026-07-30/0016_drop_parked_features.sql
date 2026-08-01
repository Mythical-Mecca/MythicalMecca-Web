-- Drop the features cut from the launch scope: news/posts, guilds, community
-- lists, and the arcade. Pre-production cleanup — the data is seed data only,
-- so this is intentionally destructive and has no down migration. Restoring a
-- feature means restoring its schema block from git and writing a fresh
-- CREATE migration.
--
-- Hand-authored: drizzle-kit's snapshots have lagged since 0008, so generate
-- would try to re-derive eight migrations' worth of history. Keep hand-authoring.

-- Arcade ---------------------------------------------------------------------
DROP TABLE IF EXISTS "game_scores" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "games" CASCADE;--> statement-breakpoint

-- Community lists ------------------------------------------------------------
DROP TABLE IF EXISTS "list_comments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "list_entry_votes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "list_entries" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "list_suggestions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "lists" CASCADE;--> statement-breakpoint

-- Guilds ---------------------------------------------------------------------
DROP TABLE IF EXISTS "guild_events" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "guild_members" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "guilds" CASCADE;--> statement-breakpoint

-- News / posts ---------------------------------------------------------------
DROP TABLE IF EXISTS "posts" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."post_status";--> statement-breakpoint

-- Enum value pruning ---------------------------------------------------------
-- Postgres cannot drop a value from an enum in place, so each type is rebuilt
-- and its column re-pointed. Both removed values were verified unused (0 rows)
-- before this migration was written.

-- file_entity: drop 'post'
ALTER TYPE "public"."file_entity" RENAME TO "file_entity_old";--> statement-breakpoint
CREATE TYPE "public"."file_entity" AS ENUM('avatar', 'event', 'partner_gallery', 'hunt_proof', 'misc');--> statement-breakpoint
ALTER TABLE "files"
  ALTER COLUMN "entity_type" TYPE "public"."file_entity"
  USING "entity_type"::text::"public"."file_entity";--> statement-breakpoint
DROP TYPE "public"."file_entity_old";--> statement-breakpoint

-- chat_scope: drop 'guild'
ALTER TYPE "public"."chat_scope" RENAME TO "chat_scope_old";--> statement-breakpoint
CREATE TYPE "public"."chat_scope" AS ENUM('event');--> statement-breakpoint
ALTER TABLE "chat_messages"
  ALTER COLUMN "scope_type" TYPE "public"."chat_scope"
  USING "scope_type"::text::"public"."chat_scope";--> statement-breakpoint
DROP TYPE "public"."chat_scope_old";
