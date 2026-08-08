-- Dropping the columns cascades their foreign keys, so the constraints are not
-- dropped by name here. That matters: production carried vendor-era constraint
-- names (`vendors_user_id_user_id_fk`, `vendors_logo_file_id_files_id_fk`) that
-- 0005 renames, and naming them again would just re-introduce the same
-- name-mismatch failure mode this migration set already tripped over once.
ALTER TABLE "partners" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "logo_file_id";
