import "server-only";
import { randomBytes } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventPlayers, playerSignups, scavengerHunts } from "@/lib/db/schema";
import { normalizeHandle } from "@/lib/event-player";
import { appUrl } from "@/lib/qr";

const useDb = !!process.env.DATABASE_URL;

/**
 * The external sign-up step.
 *
 * At a no-data event we hold a handle and a PIN and nothing else. When the
 * event's partner needs a real registration — name, email, consent — it goes
 * on *their* form, off our site, and the quest simply asks the player to go
 * and do it. We can't see their form, so the ask can't be enforced; it can
 * only be made hard to forget. Two things make it stick:
 *
 *  1. The player ticks "I've done this" before the trail opens, and again to
 *     dismiss a reminder once they finish. Their word, recorded on the
 *     player row.
 *  2. The form's side can POST to a webhook saying which handle signed up.
 *     That is the only thing we store from it, and it is what turns the
 *     reminder off without the player having to say anything.
 *
 * Responsibility stays with the player — the copy says so — but the two
 * signals together mean the organiser can see, on the day, who has said they
 * did it, who the form agrees on, and who has done neither.
 */

/** What the quest page shows a player, when the step is switched on. */
export interface SignupStep {
  url: string;
  label: string;
  blurb: string | null;
  /** The form's side told us this handle signed up. */
  confirmed: boolean;
  /** They ticked "I've done this" at the start. */
  acknowledged: boolean;
  /** They dismissed the reminder at the end. */
  reminderDismissed: boolean;
}

export const DEFAULT_SIGNUP_LABEL = "Sign up with the event";

/* ── the webhook credential ─────────────────────────────────────────────── */

/**
 * 24 random bytes, URL-safe. It travels in the path of the webhook URL, the
 * way Discord and Slack do it, because the form builders people actually use
 * (Tally, Google Forms via Apps Script, n8n, Zapier) can all POST to a URL
 * and not all of them can set a header. Same trust level as a Discord
 * webhook URL: whoever holds it can post, and rotating it revokes it.
 */
export function newSignupSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function signupWebhookUrl(secret: string): string {
  return `${appUrl()}/api/signup-hooks/${secret}`;
}

/** Secrets are opaque base64url; anything else is refused before the query. */
const SECRET_SHAPE = /^[A-Za-z0-9_-]{20,64}$/;

export type WebhookResult =
  | { ok: false; reason: "unknown_secret" | "bad_handle" | "unavailable" }
  | { ok: true; matched: boolean; handle: string };

/**
 * A form told us someone signed up. Store the handle, nothing else.
 *
 * Upsert on (event, handle): a second POST for the same handle keeps the
 * first arrival time and takes the newer reference if one came. The same
 * form resubmitted is not a second person.
 *
 * `matched` says whether a player by that handle exists yet, so the
 * organiser's test POST gets an honest answer. A miss is still stored — the
 * player may not have picked their name yet.
 */
export async function recordExternalSignup(input: {
  secret: string;
  handle: string;
  externalId: string | null;
}): Promise<WebhookResult> {
  if (!useDb) return { ok: false, reason: "unavailable" };
  if (!SECRET_SHAPE.test(input.secret)) {
    return { ok: false, reason: "unknown_secret" };
  }
  const handle = normalizeHandle(input.handle);
  if (handle.length < 1 || handle.length > 80) {
    return { ok: false, reason: "bad_handle" };
  }
  const externalId = input.externalId?.trim().slice(0, 200) || null;

  try {
    const [hunt] = await db
      .select({ id: scavengerHunts.id, eventId: scavengerHunts.eventId })
      .from(scavengerHunts)
      .where(eq(scavengerHunts.signupWebhookSecret, input.secret))
      .limit(1);
    if (!hunt) return { ok: false, reason: "unknown_secret" };

    // Raw SQL because the conflict target is an expression index
    // (event_id, lower(handle)) and the query builder only takes columns.
    await db.execute(sql`
      insert into ${playerSignups} (event_id, hunt_id, handle, external_id)
      values (${hunt.eventId}, ${hunt.id}, ${handle}, ${externalId})
      on conflict (event_id, lower(handle)) do update set
        external_id = coalesce(excluded.external_id, ${playerSignups}.external_id),
        hunt_id = excluded.hunt_id
    `);

    const [player] = await db
      .select({ id: eventPlayers.id })
      .from(eventPlayers)
      .where(
        and(
          eq(eventPlayers.eventId, hunt.eventId),
          sql`lower(${eventPlayers.handle}) = lower(${handle})`
        )
      )
      .limit(1);
    return { ok: true, matched: !!player, handle };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/* ── what the player page needs ─────────────────────────────────────────── */

/**
 * The step as this player sees it, or null when the quest doesn't ask.
 *
 * Confirmation is a lookup by handle at read time rather than a flag set on
 * arrival, so a webhook that landed before the player picked their name
 * still counts the moment they do.
 */
export async function signupStepFor(
  hunt: {
    signupUrl: string | null;
    signupLabel: string | null;
    signupBlurb: string | null;
  },
  playerId: string
): Promise<SignupStep | null> {
  if (!hunt.signupUrl) return null;
  const base: SignupStep = {
    url: hunt.signupUrl,
    label: hunt.signupLabel?.trim() || DEFAULT_SIGNUP_LABEL,
    blurb: hunt.signupBlurb?.trim() || null,
    confirmed: false,
    acknowledged: false,
    reminderDismissed: false,
  };
  if (!useDb) return base;
  try {
    const [row] = await db
      .select({
        acknowledgedAt: eventPlayers.signupAcknowledgedAt,
        dismissedAt: eventPlayers.signupReminderDismissedAt,
        confirmedAt: playerSignups.receivedAt,
      })
      .from(eventPlayers)
      .leftJoin(
        playerSignups,
        and(
          eq(playerSignups.eventId, eventPlayers.eventId),
          sql`lower(${playerSignups.handle}) = lower(${eventPlayers.handle})`
        )
      )
      .where(eq(eventPlayers.id, playerId))
      .limit(1);
    if (!row) return base;
    return {
      ...base,
      confirmed: row.confirmedAt !== null,
      acknowledged: row.acknowledgedAt !== null,
      reminderDismissed: row.dismissedAt !== null,
    };
  } catch {
    return base;
  }
}

/** The player says they filled the form in. Idempotent; keeps the first time. */
export async function acknowledgeSignup(playerId: string): Promise<void> {
  if (!useDb) return;
  try {
    await db
      .update(eventPlayers)
      .set({ signupAcknowledgedAt: sql`coalesce(${eventPlayers.signupAcknowledgedAt}, now())` })
      .where(eq(eventPlayers.id, playerId));
  } catch {
    // The page re-reads on the next render; a lost write just shows the
    // card again, which is the safe direction to fail in.
  }
}

/** The player dismissed the end-of-quest reminder. */
export async function dismissSignupReminder(playerId: string): Promise<void> {
  if (!useDb) return;
  try {
    await db
      .update(eventPlayers)
      .set({
        signupReminderDismissedAt: sql`coalesce(${eventPlayers.signupReminderDismissedAt}, now())`,
        // Dismissing the reminder is also an acknowledgement — they can't
        // have "already done this" without having done it.
        signupAcknowledgedAt: sql`coalesce(${eventPlayers.signupAcknowledgedAt}, now())`,
      })
      .where(eq(eventPlayers.id, playerId));
  } catch {
    // As above.
  }
}
