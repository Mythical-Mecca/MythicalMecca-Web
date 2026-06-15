DROP TABLE "squadron_scores" CASCADE;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "division";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "division";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "division";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "division";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "division";--> statement-breakpoint
DROP TYPE "public"."division";