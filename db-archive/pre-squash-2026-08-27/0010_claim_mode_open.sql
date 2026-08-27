-- Split the old `open_tag` in two --------------------------------------------
-- `open_tag` always meant "a plain tag, checked by geofence", which is a
-- verification method rather than an absence of one. Renaming it says what it
-- actually does, and leaves room for the genuinely open mode below.
--
-- Guarded because a value can only be renamed once: re-running this migration
-- against a database that already has `location_verified` must be a no-op, not
-- an error about a value that no longer exists.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'claim_mode' AND e.enumlabel = 'open_tag'
  ) THEN
    ALTER TYPE "public"."claim_mode" RENAME VALUE 'open_tag' TO 'location_verified';
  END IF;
END $$;--> statement-breakpoint

-- Truly open: the scan itself is the claim, with no second proof of any kind.
-- ADD VALUE runs at the top level rather than inside the DO block above —
-- Postgres refuses it inside a function body. Safe in a transaction on PG 12+
-- so long as nothing in the same transaction uses the new value, which is why
-- no data is rewritten here.
ALTER TYPE "public"."claim_mode" ADD VALUE IF NOT EXISTS 'open';
