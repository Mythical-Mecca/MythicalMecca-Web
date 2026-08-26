-- The live `partners` table predates the re-baseline and never gained the two
-- columns lib/db/schema.ts declares. Because Drizzle selects every declared
-- column, *any* query touching a whole partner row failed — and getPartners()
-- swallowed that into its demo-data fallback, so the public site showed three
-- fabricated partners and the admin objective form offered their unsavable ids.
--
-- The users table is declared as pgTable("user") — singular. Referencing
-- "public"."users" here is what made the first attempt fail with
-- `relation "public.users" does not exist`.
--
-- Purely additive. The seven columns the database carries that the schema no
-- longer declares (logo_url, banner_url, shop_url, status, submitted_at,
-- reviewed_by, review_note) are left alone: they are inert, and dropping them
-- would throw away data to no purpose.
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "logo_file_id" uuid;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_unique" UNIQUE("user_id");
EXCEPTION
 WHEN duplicate_table THEN null;
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk"
   FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_file_id_files_id_fk"
   FOREIGN KEY ("logo_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
