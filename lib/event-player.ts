import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventPlayers } from "@/lib/db/schema";
import { signValue, verifyValue } from "@/lib/qr";

const useDb = !!process.env.DATABASE_URL;

/**
 * Who is playing a no-data event's quest.
 *
 * A handle, a PIN, and nothing else — no email, no name, no link to a member
 * account. The session lives in its own cookie so that being signed into the
 * main site neither grants nor implies anything here, and vice versa: someone
 * can be a member, a player, both, or neither, and the two never meet.
 */
export interface PlayerSession {
  playerId: string;
  eventId: string;
  handle: string;
}

/**
 * Deliberately not `next-auth.session-token` and deliberately not derived from
 * it. Clearing one has no effect on the other, which is the whole point.
 */
const COOKIE = "mm_player";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // a month — longer than any event

/* ── PIN storage ─────────────────────────────────────────────────────────── */

/**
 * scrypt with a per-row salt.
 *
 * A four-digit PIN has ten thousand possible values, so no hash makes an
 * offline attack on a leaked table hard — scrypt's cost just makes it slow
 * enough to matter, and the real defence is the lockout below. What this does
 * buy, unconditionally, is that a PIN someone reuses elsewhere never sits in
 * our database in the clear.
 */
function hashPin(pin: string, salt = randomBytes(16).toString("hex")): string {
  return `scrypt$${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

function pinMatches(pin: string, stored: string): boolean {
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const a = Buffer.from(digest, "hex");
  const b = scryptSync(pin, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ── what a handle and a PIN are allowed to be ───────────────────────────── */

/**
 * Names that would let someone pass themselves off as the event.
 *
 * Not a moderation system — a handle appears on a leaderboard read out to a
 * room, so this is the short list of things that would be actively confusing
 * or hostile there. A steward can still rename anyone from the admin side.
 */
const RESERVED = [
  "admin",
  "administrator",
  "staff",
  "steward",
  "moderator",
  "mythical mecca",
  "mythicalmecca",
  "system",
  "null",
  "undefined",
];

const SLURS = ["fuck", "shit", "cunt", "nigg", "faggot", "rape", "nazi"];

/** The PINs a bored stranger tries first, and would land on within five goes. */
const OBVIOUS_PINS = new Set(["0000", "1111", "1234", "4321", "9999"]);

export const HANDLE_MAX = 20;

export function normalizeHandle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Null when the handle is fine; otherwise what to tell the person typing it. */
export function handleProblem(handle: string): string | null {
  const h = normalizeHandle(handle);
  if (h.length < 3) return "Pick a name of at least 3 characters.";
  if (h.length > HANDLE_MAX) return `Keep it under ${HANDLE_MAX} characters.`;
  if (!/^[\p{L}\p{N} '_-]+$/u.test(h)) {
    return "Letters, numbers, spaces, hyphens and underscores only.";
  }
  if (!/\p{L}/u.test(h)) return "Use at least one letter.";
  const flat = h.toLowerCase().replace(/[^a-z]/g, "");
  if (RESERVED.includes(h.toLowerCase()) || RESERVED.includes(flat)) {
    return "That name is reserved. Pick another.";
  }
  if (SLURS.some((w) => flat.includes(w))) {
    return "Pick something you'd want read out to the room.";
  }
  return null;
}

export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "Your PIN is 4 digits.";
  if (OBVIOUS_PINS.has(pin)) return "Pick a less guessable 4 digits.";
  return null;
}

/* ── the cookie ──────────────────────────────────────────────────────────── */

function encode(session: PlayerSession): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${signValue(body)}`;
}

function decode(raw: string): PlayerSession | null {
  const [body, given] = raw.split(".");
  if (!body || !given || !verifyValue(body, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed?.playerId || !parsed?.eventId || !parsed?.handle) return null;
    return parsed as PlayerSession;
  } catch {
    return null;
  }
}

/** The signed-in player, whatever event they belong to. */
export async function playerSession(): Promise<PlayerSession | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? decode(raw) : null;
}

/**
 * The signed-in player *for this event*.
 *
 * A session from another event is no session at all here — the cookie holds
 * one at a time, so walking from one no-data event to the next means signing
 * in again. Progress is in the database either way; only the PIN is re-typed.
 */
export async function playerForEvent(
  eventId: string
): Promise<PlayerSession | null> {
  const session = await playerSession();
  return session?.eventId === eventId ? session : null;
}

async function startSession(session: PlayerSession): Promise<void> {
  (await cookies()).set(COOKIE, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function endPlayerSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/* ── signing up and in ───────────────────────────────────────────────────── */

export type PlayerResult =
  | { ok: true; session: PlayerSession }
  | { ok: false; error: string; field?: "handle" | "pin" };

/** Wrong PINs allowed before a handle stops answering for a while. */
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

async function findByHandle(eventId: string, handle: string) {
  const [row] = await db
    .select()
    .from(eventPlayers)
    .where(
      and(
        eq(eventPlayers.eventId, eventId),
        sql`lower(${eventPlayers.handle}) = lower(${handle})`
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Claim a handle at this event. Fails if someone already has it — this is a
 * first-come registration, and the second person to want "Grognak" picks
 * again rather than silently sharing the first one's progress.
 */
export async function registerPlayer(input: {
  eventId: string;
  handle: string;
  pin: string;
}): Promise<PlayerResult> {
  if (!useDb) return { ok: false, error: "Sign-in is unavailable right now." };
  const handle = normalizeHandle(input.handle);
  const badHandle = handleProblem(handle);
  if (badHandle) return { ok: false, error: badHandle, field: "handle" };
  const badPin = pinProblem(input.pin);
  if (badPin) return { ok: false, error: badPin, field: "pin" };

  try {
    const [row] = await db
      .insert(eventPlayers)
      .values({ eventId: input.eventId, handle, pinHash: hashPin(input.pin) })
      // The unique index is the arbiter, not a prior SELECT: two people at the
      // same counter typing the same handle is exactly the race that check
      // would lose.
      .onConflictDoNothing()
      .returning({ id: eventPlayers.id, handle: eventPlayers.handle });

    if (!row) {
      return {
        ok: false,
        error: "Someone here already goes by that. Pick another.",
        field: "handle",
      };
    }
    const session = {
      playerId: row.id,
      eventId: input.eventId,
      handle: row.handle,
    };
    await startSession(session);
    return { ok: true, session };
  } catch {
    return { ok: false, error: "Couldn't set that up. Try again." };
  }
}

/** Come back to a handle already claimed at this event. */
export async function signInPlayer(input: {
  eventId: string;
  handle: string;
  pin: string;
}): Promise<PlayerResult> {
  if (!useDb) return { ok: false, error: "Sign-in is unavailable right now." };
  const handle = normalizeHandle(input.handle);
  if (!handle || !/^\d{4}$/.test(input.pin)) {
    return { ok: false, error: "Enter your name and your 4-digit PIN." };
  }

  try {
    const row = await findByHandle(input.eventId, handle);
    if (!row) {
      return {
        ok: false,
        error: "No adventurer here by that name yet.",
        field: "handle",
      };
    }

    if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
      const mins = Math.max(
        1,
        Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000)
      );
      return {
        ok: false,
        error: `Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        field: "pin",
      };
    }

    if (!pinMatches(input.pin, row.pinHash)) {
      const failed = row.failedPins + 1;
      await db
        .update(eventPlayers)
        .set({
          failedPins: failed,
          lockedUntil:
            failed >= MAX_PIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
        })
        .where(eq(eventPlayers.id, row.id));
      return { ok: false, error: "That PIN doesn't match.", field: "pin" };
    }

    // A correct PIN clears the count: the five wrong guesses that preceded it
    // were the owner misremembering, not an attack in progress.
    await db
      .update(eventPlayers)
      .set({ failedPins: 0, lockedUntil: null, lastSeenAt: new Date() })
      .where(eq(eventPlayers.id, row.id));

    const session = {
      playerId: row.id,
      eventId: input.eventId,
      handle: row.handle,
    };
    await startSession(session);
    return { ok: true, session };
  } catch {
    return { ok: false, error: "Couldn't sign you in. Try again." };
  }
}

/** Display name for a player id — the station scanner's confirmation flash. */
export async function playerHandle(playerId: string): Promise<string | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({ handle: eventPlayers.handle })
      .from(eventPlayers)
      .where(eq(eventPlayers.id, playerId))
      .limit(1);
    return row?.handle ?? null;
  } catch {
    return null;
  }
}
