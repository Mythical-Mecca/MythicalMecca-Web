-- Realign legacy constraint names (hand-written, idempotent) -----------------
-- The vendor->partner rename used ALTER TABLE ... RENAME, which renames tables
-- and columns but NOT their constraints. Production therefore still carries
-- `vendors_*` / `vendor_applications_*` / `vendor_gallery_items_*` names, while
-- drizzle's snapshot believes they are `partners_*`. Every generated migration
-- that touches one of them emits a DROP for a name that does not exist and dies
-- — which is exactly what this migration would have done below.
--
-- Renaming them here fixes that permanently, not just for this migration. Runs
-- as a no-op on a database built from 0000_baseline, which already has the new
-- names.
DO $$
DECLARE m record;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      ('partners',              'vendors_pkey',                                 'partners_pkey'),
      ('partners',              'vendors_slug_unique',                          'partners_slug_unique'),
      ('partners',              'vendors_user_id_unique',                       'partners_user_id_unique'),
      ('partners',              'vendors_user_id_user_id_fk',                   'partners_user_id_user_id_fk'),
      ('partners',              'vendors_logo_file_id_files_id_fk',             'partners_logo_file_id_files_id_fk'),
      ('partner_applications',  'vendor_applications_pkey',                     'partner_applications_pkey'),
      ('partner_applications',  'vendor_applications_user_id_user_id_fk',       'partner_applications_user_id_user_id_fk'),
      ('partner_applications',  'vendor_applications_reviewed_by_user_id_fk',   'partner_applications_reviewed_by_user_id_fk'),
      ('partner_gallery_items', 'vendor_gallery_items_pkey',                    'partner_gallery_items_pkey'),
      ('partner_gallery_items', 'vendor_gallery_items_file_id_files_id_fk',     'partner_gallery_items_file_id_files_id_fk'),
      ('partner_gallery_items', 'vendor_gallery_items_vendor_id_vendors_id_fk', 'partner_gallery_items_partner_id_partners_id_fk')
    ) AS t(tbl, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = m.old_name AND conrelid = m.tbl::regclass
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = m.new_name AND conrelid = m.tbl::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I RENAME CONSTRAINT %I TO %I', m.tbl, m.old_name, m.new_name
      );
    END IF;
  END LOOP;
END $$;--> statement-breakpoint
CREATE TYPE "public"."offering_kind" AS ENUM('product', 'service');--> statement-breakpoint
CREATE TYPE "public"."partner_invite_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."partner_member_role" AS ENUM('owner', 'manager');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('draft', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "partner_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"email" text,
	"invited_user_id" text,
	"role" "partner_member_role" DEFAULT 'manager' NOT NULL,
	"token_hash" text NOT NULL,
	"status" "partner_invite_status" DEFAULT 'pending' NOT NULL,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "partner_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "partner_member_role" DEFAULT 'manager' NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"kind" "offering_kind" DEFAULT 'product' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"image_url" text,
	"external_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- IF EXISTS: the rename block above guarantees this name, but a database that
-- somehow carries a third naming lineage should not hard-fail here.
ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "partners_user_id_unique";--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "shop_url" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "status" "partner_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_invited_user_id_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_accepted_by_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_offerings" ADD CONSTRAINT "partner_offerings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_invites_partner_idx" ON "partner_invites" USING btree ("partner_id","status");--> statement-breakpoint
CREATE INDEX "partner_invites_email_idx" ON "partner_invites" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "partner_invites_user_idx" ON "partner_invites" USING btree ("invited_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_members_unique" ON "partner_members" USING btree ("partner_id","user_id");--> statement-breakpoint
CREATE INDEX "partner_members_user_idx" ON "partner_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "partner_offerings_partner_idx" ON "partner_offerings" USING btree ("partner_id","sort");--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_gallery_items_partner_idx" ON "partner_gallery_items" USING btree ("partner_id","sort");--> statement-breakpoint
CREATE INDEX "partners_category_idx" ON "partners" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "partners_public_idx" ON "partners" USING btree ("status","active");--> statement-breakpoint
-- Backfill (hand-written) -----------------------------------------------------
-- Every existing single-owner partner becomes an owner membership. `user_id`
-- stays in place until 0007, once no reader depends on it.
INSERT INTO "partner_members" ("partner_id","user_id","role")
SELECT "id", "user_id", 'owner' FROM "partners" WHERE "user_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Everything that already existed predates the review lifecycle, so it is live.
-- `active` stays orthogonal: approved + inactive is a valid, intentional state.
UPDATE "partners" SET "status" = 'approved';--> statement-breakpoint
-- Socials: {raw:"a, b"} -> {instagram:"a", website:"b"} -----------------------
-- Every writer now stores the keyed shape (which is what the public page reads,
-- and what the application wizard has always produced), so the legacy freeform
-- rows are converted here. Classification mirrors lib/socials.ts.
-- Note: jsonb_object_agg keeps the LAST value on a duplicate key, so two
-- Instagram links in one raw string collapse to the second. Acceptable — the
-- tolerant reader would have shown both, and this only affects legacy rows.
UPDATE "partners" p SET "socials" = sub.obj
FROM (
  SELECT id, jsonb_object_agg(
    CASE
      WHEN url ILIKE '%instagram.%'                         THEN 'instagram'
      WHEN url ILIKE '%youtube.%' OR url ILIKE '%youtu.be%' THEN 'youtube'
      WHEN url ILIKE '%tiktok.%'                            THEN 'tiktok'
      WHEN url ILIKE '%twitter.%' OR url ILIKE '%x.com%'    THEN 'x'
      WHEN url ILIKE '%facebook.%' OR url ILIKE '%fb.com%'  THEN 'facebook'
      WHEN url ILIKE '%discord.%'                           THEN 'discord'
      WHEN url ILIKE '%etsy.%'                              THEN 'etsy'
      ELSE 'website'
    END, url) AS obj
  FROM (
    SELECT p2.id, trim(u) AS url
    FROM "partners" p2, regexp_split_to_table(p2."socials"->>'raw', ',') AS u
    WHERE p2."socials" ? 'raw' AND coalesce(p2."socials"->>'raw','') <> ''
  ) x
  WHERE url <> ''
  GROUP BY id
) sub
WHERE p."id" = sub.id;--> statement-breakpoint
-- Any row whose raw string was empty or whitespace: drop the legacy wrapper.
UPDATE "partners" SET "socials" = NULL WHERE "socials" ? 'raw';