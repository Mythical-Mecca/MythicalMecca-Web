ALTER TABLE "user" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_banned_by_user_id_fk" FOREIGN KEY ("banned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;