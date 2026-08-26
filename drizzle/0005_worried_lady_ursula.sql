CREATE TABLE "gallery_item_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"viewer_key" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_items" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD COLUMN "unique_views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gallery_item_views" ADD CONSTRAINT "gallery_item_views_item_id_gallery_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."gallery_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_item_views" ADD CONSTRAINT "gallery_item_views_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_item_views_viewer_idx" ON "gallery_item_views" USING btree ("item_id","viewer_key");