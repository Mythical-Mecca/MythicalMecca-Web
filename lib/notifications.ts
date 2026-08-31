import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { signValue, verifyValue } from "@/lib/qr";

const useDb = !!process.env.DATABASE_URL;

/**
 * The channels a member can be reached on.
 *
 * `discord` is declared and stored but nothing sends on it yet — the app has
 * outgoing channel webhooks, not a bot, so there is no way to open a DM. See
 * the note on the column in lib/db/schema.ts.
 */
export const CHANNELS = ["inApp", "email", "discord"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface NotificationPrefs {
  inApp: boolean;
  email: boolean;
  discord: boolean;
}

/**
 * What somebody gets before they have ever opened the settings.
 *
 * A member with no row is reachable rather than silent: the alternative is
 * that everybody who never visits their profile quietly stops hearing about
 * the events they signed up for.
 */
export const DEFAULT_PREFS: NotificationPrefs = {
  inApp: true,
  email: true,
  discord: false,
};

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  if (!useDb) return DEFAULT_PREFS;
  try {
    const [row] = await db
      .select({
        inApp: notificationPreferences.inApp,
        email: notificationPreferences.email,
        discord: notificationPreferences.discord,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return row ?? DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Upsert, so the first save creates the row and later ones update it. */
export async function setPrefs(
  userId: string,
  prefs: NotificationPrefs
): Promise<boolean> {
  if (!useDb) return false;
  try {
    await db
      .insert(notificationPreferences)
      .values({ userId, ...prefs })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...prefs, updatedAt: new Date() },
      });
    return true;
  } catch {
    return false;
  }
}

/** Turn a single channel off. What the unsubscribe endpoint calls. */
export async function disableChannel(
  userId: string,
  channel: Channel
): Promise<boolean> {
  const current = await getPrefs(userId);
  return setPrefs(userId, { ...current, [channel]: false });
}

/* ── unsubscribe links ─────────────────────────────────────────────────── */

/**
 * The credential an unsubscribe link carries.
 *
 * Someone acting on an unsubscribe link has no session — they are in their
 * mail client, and asking them to sign in first is how you get a spam report
 * instead of an unsubscribe. So the link itself has to be the proof, which
 * means it is signed and names exactly one member and one channel.
 *
 * Deliberately without an expiry: mail sits in inboxes for years, and a dead
 * unsubscribe link is worse than an old one. The token grants nothing except
 * turning off one channel for one person, which is not worth stealing and is
 * reversible from the profile.
 */
export function unsubscribeToken(userId: string, channel: Channel): string {
  const body = `${channel}:${userId}`;
  return Buffer.from(`${body}:${signValue(body)}`).toString("base64url");
}

export function verifyUnsubscribeToken(
  token: string
): { userId: string; channel: Channel } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [channel, userId, given] = decoded.split(":");
    if (!channel || !userId || !given) return null;
    if (!CHANNELS.includes(channel as Channel)) return null;
    if (!verifyValue(`${channel}:${userId}`, given)) return null;
    return { userId, channel: channel as Channel };
  } catch {
    return null;
  }
}

/**
 * The URL to put in an email footer.
 *
 * Absolute, because it is read outside the browser that has our origin.
 */
export function unsubscribeUrl(userId: string, channel: Channel = "email") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/api/notifications/unsubscribe?t=${unsubscribeToken(userId, channel)}`;
}
