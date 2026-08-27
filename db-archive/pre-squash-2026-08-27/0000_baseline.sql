CREATE TYPE "public"."app_status" AS ENUM('draft', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."chat_scope" AS ENUM('event');--> statement-breakpoint
CREATE TYPE "public"."event_origin" AS ENUM('hosted', 'partner', 'external', 'community');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'live', 'ended', 'cancelled', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."file_entity" AS ENUM('avatar', 'event', 'partner_gallery', 'hunt_proof', 'misc');--> statement-breakpoint
CREATE TYPE "public"."gallery_kind" AS ENUM('art', 'product');--> statement-breakpoint
CREATE TYPE "public"."hunt_mode" AS ENUM('in_person', 'remote', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."lfg_join_mode" AS ENUM('open', 'approval');--> statement-breakpoint
CREATE TYPE "public"."lfg_member_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('debug', 'info', 'warn', 'error', 'fatal');--> statement-breakpoint
CREATE TYPE "public"."review_target" AS ENUM('site', 'partner');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'partner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."step_type" AS ENUM('qr_scan', 'riddle', 'crossword', 'cipher', 'geo_checkpoint', 'photo_proof', 'trivia_gate', 'unlock_code');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"ip" text,
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" "chat_scope" NOT NULL,
	"scope_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "collab_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"org" text,
	"message" text NOT NULL,
	"payload" jsonb,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "log_level" DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"route" text,
	"actor_id" text,
	"metadata" jsonb,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body_md" text,
	"cover_file_id" uuid,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"location" text,
	"lat" double precision,
	"lng" double precision,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"capacity" integer,
	"origin" "event_origin" DEFAULT 'hosted' NOT NULL,
	"partner_id" uuid,
	"source_name" text,
	"external_url" text,
	"reviewed_by" text,
	"review_note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
	"blob_url" text NOT NULL,
	"obscured_key" text NOT NULL,
	"original_name" text,
	"mime" text,
	"size_bytes" integer,
	"entity_type" "file_entity",
	"entity_id" text,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_obscured_key_unique" UNIQUE("obscured_key")
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"uploaded_by" text,
	"published" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hunt_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hunt_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb,
	"points_awarded" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hunt_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hunt_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"type" "step_type" NOT NULL,
	"title" text NOT NULL,
	"prompt" text,
	"points" integer DEFAULT 10 NOT NULL,
	"config" jsonb,
	"requires_prev" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lfg_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "lfg_member_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lfg_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" text NOT NULL,
	"title" text NOT NULL,
	"game_system" text NOT NULL,
	"description" text,
	"venue_text" text,
	"partner_id" uuid,
	"event_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"total_seats" integer,
	"join_mode" "lfg_join_mode" DEFAULT 'open' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"actor_id" text,
	"referrer" text,
	"session_id" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category_id" uuid,
	"status" "app_status" DEFAULT 'pending' NOT NULL,
	"business_name" text,
	"pitch" text NOT NULL,
	"images" jsonb,
	"socials" jsonb,
	"payload" jsonb,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE "partner_gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"file_id" uuid,
	"kind" "gallery_kind" DEFAULT 'art' NOT NULL,
	"image_url" text,
	"title" text,
	"caption" text,
	"external_url" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"category_id" uuid,
	"slug" text NOT NULL,
	"business_name" text NOT NULL,
	"tagline" text,
	"bio" text,
	"logo_file_id" uuid,
	"socials" jsonb,
	"is_premium" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "partners_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE "scavenger_hunts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"mode" "hunt_mode" DEFAULT 'hybrid' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scavenger_hunts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"avatar_url" text,
	"banner_url" text,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_log" ADD CONSTRAINT "error_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_gallery_items" ADD CONSTRAINT "event_gallery_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_interests" ADD CONSTRAINT "event_interests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_interests" ADD CONSTRAINT "event_interests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cover_file_id_files_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_progress" ADD CONSTRAINT "hunt_progress_hunt_id_scavenger_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."scavenger_hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_progress" ADD CONSTRAINT "hunt_progress_step_id_hunt_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."hunt_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_progress" ADD CONSTRAINT "hunt_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_steps" ADD CONSTRAINT "hunt_steps_hunt_id_scavenger_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."scavenger_hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_members" ADD CONSTRAINT "lfg_members_post_id_lfg_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."lfg_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_members" ADD CONSTRAINT "lfg_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_hits" ADD CONSTRAINT "page_hits_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_category_id_partner_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."partner_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_gallery_items" ADD CONSTRAINT "partner_gallery_items_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_gallery_items" ADD CONSTRAINT "partner_gallery_items_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_category_id_partner_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."partner_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_file_id_files_id_fk" FOREIGN KEY ("logo_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD CONSTRAINT "scavenger_hunts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scavenger_hunts" ADD CONSTRAINT "scavenger_hunts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_log_actor_idx" ON "activity_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "chat_messages_scope_idx" ON "chat_messages" USING btree ("scope_type","scope_id","created_at");--> statement-breakpoint
CREATE INDEX "error_log_created_at_idx" ON "error_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_comments_event_idx" ON "event_comments" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "event_gallery_event_idx" ON "event_gallery_items" USING btree ("event_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "event_interests_unique" ON "event_interests" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_reviews_unique" ON "event_reviews" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "events_starts_ends_idx" ON "events" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "events_origin_status_idx" ON "events" USING btree ("origin","status");--> statement-breakpoint
CREATE INDEX "events_partner_idx" ON "events" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "gallery_items_sort_idx" ON "gallery_items" USING btree ("sort");--> statement-breakpoint
CREATE UNIQUE INDEX "hunt_progress_unique" ON "hunt_progress" USING btree ("step_id","user_id");--> statement-breakpoint
CREATE INDEX "hunt_progress_hunt_user_idx" ON "hunt_progress" USING btree ("hunt_id","user_id");--> statement-breakpoint
CREATE INDEX "hunt_steps_hunt_idx" ON "hunt_steps" USING btree ("hunt_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "lfg_members_unique" ON "lfg_members" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "lfg_members_user_idx" ON "lfg_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lfg_posts_starts_idx" ON "lfg_posts" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "lfg_posts_host_idx" ON "lfg_posts" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "lfg_posts_event_idx" ON "lfg_posts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "page_hits_path_created_idx" ON "page_hits" USING btree ("path","created_at");--> statement-breakpoint
CREATE INDEX "reviews_target_idx" ON "reviews" USING btree ("target_type","target_id","status");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");