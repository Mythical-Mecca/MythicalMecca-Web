import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { collabSubmissions } from "@/lib/db/schema";
import { signValue, verifyValue } from "@/lib/qr";

const useDb = !!process.env.DATABASE_URL;

/**
 * Cheap defences for a public form, in the order they cost the sender.
 *
 * The spam this was written against is scripted: something scrapes the domain,
 * POSTs a pitch, and moves on. None of it solves a challenge, waits, or reads
 * the page — so the first three checks here cost a real person nothing and
 * catch most of it. Turnstile (lib/turnstile.ts) is the backstop for the rest.
 */

/* ── 1. Honeypot ───────────────────────────────────────────────────────────
   A field a person never sees and a bot fills in because it is named like
   something worth filling. Not `type="hidden"` — plenty of bots skip those. */

export const HONEYPOT_FIELD = "website";

export function honeypotTripped(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? "").trim().length > 0;
}

/* ── 2. Timing trap ────────────────────────────────────────────────────────
   The page stamps itself when it renders and the form carries the stamp back.
   A bot POSTs the instant it parses the page; nobody types a name, an address
   and a paragraph in under three seconds. Signed, so the stamp cannot simply
   be back-dated by whoever is posting. */

const MIN_FILL_MS = 3000;
/** Past this the stamp is stale — a tab left open overnight, most likely. */
const MAX_FILL_MS = 12 * 60 * 60 * 1000;

export function formStamp(now = Date.now()): string {
  const body = String(now);
  return `${body}.${signValue(body)}`;
}

export function stampProblem(
  raw: string,
  now = Date.now()
): "missing" | "too-fast" | "stale" | null {
  const [body, given] = String(raw ?? "").split(".");
  if (!body || !given || !verifyValue(body, given)) return "missing";
  const issued = Number(body);
  if (!Number.isFinite(issued)) return "missing";
  const age = now - issued;
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > MAX_FILL_MS) return "stale";
  return null;
}

/* ── 3. Rate limit ─────────────────────────────────────────────────────────
   Counted off what was stored, quarantined rows included, so a bot that keeps
   posting still counts against itself. */

const MAX_PER_IP = 3;
const IP_WINDOW_MS = 60 * 60 * 1000;

export async function tooManyFromIp(ip: string | null): Promise<boolean> {
  if (!useDb || !ip) return false;
  try {
    const since = new Date(Date.now() - IP_WINDOW_MS);
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(collabSubmissions)
      .where(
        and(
          eq(collabSubmissions.ip, ip),
          gte(collabSubmissions.createdAt, since)
        )
      );
    return Number(row?.n ?? 0) >= MAX_PER_IP;
  } catch {
    // A counting failure must not become a closed front door.
    return false;
  }
}

/* ── 4. Quarantine scoring ─────────────────────────────────────────────────
   Signals, not verdicts. Everything here has a plausible innocent explanation
   on its own, which is why a hit stores the message and flags it rather than
   refusing it. */

const OUR_DOMAINS = ["mythicalmecca", "mythicalmecha"];
const SALES_WORDS = [
  "seo",
  "search engine",
  "google search index",
  "backlink",
  "web design",
  "digital marketing",
  "rank higher",
  "first page",
  "guest post",
  "crypto",
  "jackpot",
];

export interface SpamVerdict {
  spam: boolean;
  score: number;
  reason: string | null;
}

/** At or above this a message is stored but kept out of the inbox. */
const QUARANTINE_AT = 3;

export function scoreSubmission(input: {
  name: string;
  email: string;
  org?: string;
  message: string;
}): SpamVerdict {
  const reasons: string[] = [];
  let score = 0;
  const msg = input.message.toLowerCase();
  const from = input.email.toLowerCase();

  const links = (input.message.match(/https?:\/\/|www\./gi) ?? []).length;
  if (links > 0) {
    score += links > 1 ? 3 : 2;
    reasons.push(`${links} link${links === 1 ? "" : "s"} in the message`);
  }

  // A pitch quotes the site back at you; somebody with something to say does
  // not need to tell us our own address.
  if (OUR_DOMAINS.some((d) => msg.includes(d))) {
    score += 2;
    reasons.push("quotes our own domain");
  }

  // The `domains@search-mythicalmecca.com` pattern: our brand in their address.
  if (OUR_DOMAINS.some((d) => from.includes(d))) {
    score += 3;
    reasons.push("sender address impersonates our domain");
  }

  const hits = SALES_WORDS.filter((w) => msg.includes(w));
  if (hits.length) {
    score += hits.length >= 2 ? 3 : 1;
    reasons.push(`sales language (${hits.slice(0, 3).join(", ")})`);
  }

  if (/https?:\/\//i.test(input.name)) {
    score += 3;
    reasons.push("name field is a URL");
  }

  return {
    spam: score >= QUARANTINE_AT,
    score,
    reason: reasons.length ? reasons.join("; ") : null,
  };
}
