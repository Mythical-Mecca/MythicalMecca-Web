ALTER TABLE "collab_submissions" ADD COLUMN "ip" text;--> statement-breakpoint
ALTER TABLE "collab_submissions" ADD COLUMN "spam" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collab_submissions" ADD COLUMN "spam_reason" text;