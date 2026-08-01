-- Vendor → Partner rename (data-preserving) + partner categories, premium,
-- gallery kind, and the unified reviews table. Hand-authored: drizzle-kit
-- cannot emit value/table renames without an interactive TTY.

-- 1. Rename enum values (RENAME VALUE is safe to use immediately) ------------
ALTER TYPE "public"."role" RENAME VALUE 'vendor' TO 'partner';--> statement-breakpoint
ALTER TYPE "public"."file_entity" RENAME VALUE 'vendor_gallery' TO 'partner_gallery';--> statement-breakpoint

-- 2. Rename tables + column (preserves all rows & FKs) -----------------------
ALTER TABLE "vendors" RENAME TO "partners";--> statement-breakpoint
ALTER TABLE "vendor_applications" RENAME TO "partner_applications";--> statement-breakpoint
ALTER TABLE "vendor_gallery_items" RENAME TO "partner_gallery_items";--> statement-breakpoint
ALTER TABLE "partner_gallery_items" RENAME COLUMN "vendor_id" TO "partner_id";--> statement-breakpoint

-- 3. New enums ---------------------------------------------------------------
CREATE TYPE "public"."gallery_kind" AS ENUM('art', 'product');--> statement-breakpoint
CREATE TYPE "public"."review_target" AS ENUM('site', 'partner');--> statement-breakpoint

-- 4. Partner categories ------------------------------------------------------
CREATE TABLE "partner_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"requires_application" boolean DEFAULT true NOT NULL,
	"allow_self_manage" boolean DEFAULT true NOT NULL,
	"allow_admin_manage" boolean DEFAULT true NOT NULL,
	"show_products" boolean DEFAULT false NOT NULL,
	"show_art" boolean DEFAULT true NOT NULL,
	"show_reviews" boolean DEFAULT true NOT NULL,
	"show_socials" boolean DEFAULT true NOT NULL,
	"show_gallery" boolean DEFAULT true NOT NULL,
	"has_premium_option" boolean DEFAULT false NOT NULL,
	"featured_on_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_categories_slug_unique" UNIQUE("slug")
);--> statement-breakpoint

-- 5. Partner columns ---------------------------------------------------------
ALTER TABLE "partners" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "is_premium" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "partner_gallery_items" ADD COLUMN "kind" "gallery_kind" DEFAULT 'art' NOT NULL;--> statement-breakpoint

-- 6. Reviews -----------------------------------------------------------------
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "review_target" NOT NULL,
	"target_id" text,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"status" "app_status" DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 7. Foreign keys ------------------------------------------------------------
ALTER TABLE "partners" ADD CONSTRAINT "partners_category_id_partner_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."partner_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_category_id_partner_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."partner_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 8. Indexes -----------------------------------------------------------------
CREATE INDEX "reviews_target_idx" ON "reviews" USING btree ("target_type","target_id","status");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint

-- 9. Seed the three starting categories --------------------------------------
INSERT INTO "partner_categories"
	("slug","name","description","icon","color","sort","show_products","show_art","show_reviews","show_socials","show_gallery","has_premium_option","featured_on_home")
VALUES
	('vendors','Vendors','Makers & merchants who sell their wares.','game-icons:anvil','#E18D01',0,true,true,true,true,true,true,true),
	('artists','Artists','Creators showing off their art.','game-icons:paint-brush','#9a6cff',1,false,true,true,true,true,false,true),
	('collaborators','Collaborators','People we work with from time to time.','mdi:handshake-outline','#48c8d6',2,false,false,false,true,false,false,false);--> statement-breakpoint

-- 10. Backfill existing partners into the Vendors category -------------------
UPDATE "partners" SET "category_id" = (SELECT "id" FROM "partner_categories" WHERE "slug" = 'vendors') WHERE "category_id" IS NULL;
