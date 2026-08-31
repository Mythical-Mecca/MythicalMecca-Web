ALTER TYPE "public"."claim_outcome" ADD VALUE 'not_allowed';--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD COLUMN "allow_list_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD COLUMN "allow_list" jsonb DEFAULT '[]'::jsonb NOT NULL;