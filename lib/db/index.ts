import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Placeholder keeps module load from throwing before Neon is provisioned.
// Real queries fail until DATABASE_URL is set — provision Neon, then add it.
// `|| ` (not `??`) so an empty-string env var also falls back to the placeholder.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
