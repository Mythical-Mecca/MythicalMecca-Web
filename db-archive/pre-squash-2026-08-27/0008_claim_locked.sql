-- Alone in its own migration on purpose: Postgres refuses to use a new enum
-- value in the same transaction that adds it, and drizzle-kit runs a file as
-- one transaction. 0004 added 'rate_limited' the same way.
ALTER TYPE "public"."claim_outcome" ADD VALUE IF NOT EXISTS 'locked';
