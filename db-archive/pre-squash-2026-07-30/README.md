# Pre-squash migration history (archived 2026-07-30)

These are migrations `0000`–`0016` as they existed before the migration history
was squashed into a single `drizzle/0000_baseline.sql`.

**Why they were squashed:** `drizzle/meta/` only ever had snapshots for
`0000`–`0007`, so `drizzle-kit generate` diffed the schema against a nine-
migration-stale baseline. It re-emitted every enum and table as "new" and
prompted nonsense rename questions (e.g. *"is `chat_scope` created or renamed
from `badge_tier`?"*) before crashing in `enumsResolver`. Backfilling nine
snapshots by hand wasn't practical; squashing was.

The database was **not** rebuilt — the baseline was generated from the live
schema and recorded in `drizzle.__drizzle_migrations` as already applied, so no
data moved and `drizzle-kit migrate` is a clean no-op.

**These files are dead.** Nothing reads them. They're kept only so the schema's
evolution is recoverable; `0000`–`0007` also exist in git history, but
`0008`–`0016` were never committed, so this folder is their only copy.

Safe to delete once you're confident in the baseline.
