ALTER TABLE "partners" DROP CONSTRAINT "partners_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "partners" DROP CONSTRAINT "partners_logo_file_id_files_id_fk";
--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "logo_file_id";