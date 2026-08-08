import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Migrations connect over plain TCP via `pg`, NOT the Neon serverless driver.
 *
 * drizzle-kit picks a driver by probing installed packages in the order
 * pg → postgres → @vercel/postgres → @neondatabase/serverless. With only
 * @neondatabase/serverless present it fell through to that one, which talks to
 * Neon over a WebSocket proxy — built for edge runtimes, and it simply hangs at
 * "applying migrations…" here. `pg` is a devDependency purely so this CLI path
 * picks it up first; the app itself still uses neon-http at runtime.
 */

/**
 * Prefer a direct (non-pooled) endpoint for DDL.
 *
 * Neon's pooled host runs PgBouncer in transaction mode, which doesn't reliably
 * support the session-level behaviour a migration runner expects. The direct
 * endpoint is the same host without the `-pooler` suffix. Set
 * DATABASE_URL_UNPOOLED explicitly to override this derivation.
 */
function migrationUrl(): string {
  const explicit = process.env.DATABASE_URL_UNPOOLED;
  if (explicit) return explicit;

  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("-pooler.")) return url;
  try {
    const u = new URL(url);
    u.hostname = u.hostname.replace("-pooler.", ".");
    return u.toString();
  } catch {
    return url;
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl(),
  },
  verbose: true,
  strict: true,
});
