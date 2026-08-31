import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Claimant } from "@/lib/claimant";

/**
 * Thrown when production has no signing secret. A distinct type so callers can
 * re-raise it instead of folding it into their "not found" path — this failing
 * quietly cost an afternoon: the admin quest page caught it, returned null, and
 * rendered a 404 that looked for all the world like a missing record.
 */
export class MissingSigningSecretError extends Error {
  constructor() {
    super(
      "QR_SIGNING_SECRET is not set. Quest check-in security depends on it — " +
        "set it in the deployment environment and redeploy."
    );
    this.name = "MissingSigningSecretError";
  }
}

/**
 * Every tag token, station code and player pass is derived from this. If it
 * were missing in production the fallback would be a value published in this
 * repo — anyone could mint a pass for any user id, and the whole
 * proof-of-presence model would be decorative. So production refuses to sign
 * anything rather than signing it insecurely and looking fine.
 *
 * Resolved on first use rather than at import: `next build` evaluates modules
 * to collect route data, and a build machine has no business needing the
 * runtime signing key.
 */
let cachedSecret: string | null = null;
function signingSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.QR_SIGNING_SECRET;
  if (fromEnv) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new MissingSigningSecretError();
  }
  cachedSecret = "dev-insecure-qr-secret";
  return cachedSecret;
}

function sig(data: string): string {
  return createHmac("sha256", signingSecret())
    .update(data)
    .digest("hex")
    .slice(0, 32);
}

/**
 * HMAC of an arbitrary string under the same secret as everything else here.
 *
 * Exported for the no-data event player session (lib/event-player.ts), which
 * is a signed cookie rather than a QR code but has exactly the same needs: a
 * value the server minted, verifiable without a lookup, worthless to forge.
 * Sharing the secret keeps one thing to rotate rather than two.
 */
export function signValue(data: string): string {
  return sig(data);
}

/** Constant-time check of a {@link signValue} signature. */
export function verifyValue(data: string, given: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(sig(data));
  return a.length === b.length && timingSafeEqual(a, b);
}

const isLocalhost = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);

/**
 * The origin printed onto every QR code and written to every NFC tag.
 *
 * A tag must point at the public site, never at whatever machine generated it
 * — and a localhost tag is worse than no tag, because it looks fine until
 * someone scans it at the event. `NEXT_PUBLIC_APP_URL` being copied verbatim
 * from a local `.env` into the deployment is an easy and near-invisible
 * mistake, so in production a localhost value is ignored in favour of the
 * domain Vercel already knows it is serving.
 */
export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const inProduction = process.env.NODE_ENV === "production";

  if (configured && !(inProduction && isLocalhost(configured))) {
    return configured.replace(/\/+$/, "");
  }

  // Set by Vercel to the project's stable production domain (no protocol).
  // Preferred over VERCEL_URL, which is unique per deployment and would bake a
  // dead preview host into a printed tag.
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelDomain) return `https://${vercelDomain}`;

  if (inProduction) {
    throw new Error(
      "Cannot build a tag URL: NEXT_PUBLIC_APP_URL is unset or points at " +
        "localhost, and no Vercel production domain is available. Set " +
        "NEXT_PUBLIC_APP_URL to the public site URL and redeploy."
    );
  }
  return "http://localhost:3081";
}

// ---------------------------------------------------------------------------
// Tag tokens — what gets printed on a QR code or written to an NFC tag.
//
// The critical property: a tag identifies an objective, it never *completes*
// one. Anything printed on paper is a public string the moment one person
// photographs it, so authority has to come from a second signal at claim time
// (see the station codes below). That split is what lets an objective switch
// between claim modes mid-event without a single tag being reprinted.
// ---------------------------------------------------------------------------

/** Signed, URL-safe token naming one objective. Stable for the tag's life. */
export function tagToken(stepId: string): string {
  return Buffer.from(`${stepId}:${sig(stepId)}`).toString("base64url");
}

export function verifyTagToken(token: string): string | null {
  try {
    const [stepId, given] = Buffer.from(token, "base64url")
      .toString("utf8")
      .split(":");
    if (!stepId || !given) return null;
    const a = Buffer.from(given);
    const b = Buffer.from(sig(stepId));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return stepId;
  } catch {
    return null;
  }
}

/**
 * The URL to print as a QR code or write to an NFC tag. Kept short so the QR
 * stays low-density (readable from further away, in worse light) and fits an
 * NTAG 213's 144-byte user memory comfortably.
 */
export function tagUrl(stepId: string): string {
  return `${appUrl()}/q/${tagToken(stepId)}`;
}

// ---------------------------------------------------------------------------
// Station codes — the proof-of-presence half.
//
// A vendor keeps their station page open; it shows a code that rolls on a
// fixed interval. Codes are derived, not stored: HOTP-style truncation of
// HMAC(stationKey, windowIndex). The key never leaves the server — the station
// page is handed a short buffer of upcoming codes instead, so a network blip
// mid-event doesn't freeze the display.
// ---------------------------------------------------------------------------

/** 32 bytes of entropy, base64. One per station. */
export function newStationKey(): string {
  return randomBytes(32).toString("base64");
}

export function windowIndex(rotationSeconds: number, atMs = Date.now()): number {
  return Math.floor(atMs / 1000 / rotationSeconds);
}

/** HOTP-style dynamic truncation down to 4 digits. */
export function stationCode(stationKey: string, window: number): string {
  const mac = createHmac("sha256", Buffer.from(stationKey, "base64"))
    .update(String(window))
    .digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(bin % 10_000).padStart(4, "0");
}

/**
 * The codes a station should display next, with the wall-clock range each is
 * valid for. `count` of 3 gives the display roughly three rotations of runway
 * to survive a dropped connection.
 */
export function upcomingCodes(
  stationKey: string,
  rotationSeconds: number,
  count = 3,
  atMs = Date.now()
): { code: string; from: number; to: number }[] {
  const start = windowIndex(rotationSeconds, atMs);
  return Array.from({ length: count }, (_, i) => {
    const w = start + i;
    return {
      code: stationCode(stationKey, w),
      from: w * rotationSeconds * 1000,
      to: (w + 1) * rotationSeconds * 1000,
    };
  });
}

/**
 * Accepts the current window and the one before it — no look-ahead.
 *
 * The look-behind is necessary: a player reads the digits just as the code
 * rolls, types them, and submits a moment later. A look-ahead would only help
 * with clock skew on the *vendor's* device, and there is none to correct — the
 * codes are minted server-side and merely displayed by the station. Including
 * it would have made each code valid before it was ever shown, lengthening the
 * life of a forwarded screenshot for no benefit.
 *
 * Net effect: a code is usable for at most two rotations from the moment it
 * appears. Don't widen this.
 */
export function verifyStationCode(
  stationKey: string,
  rotationSeconds: number,
  submitted: string,
  atMs = Date.now()
): boolean {
  const given = submitted.trim();
  if (!/^\d{4}$/.test(given)) return false;
  const now = windowIndex(rotationSeconds, atMs);
  let ok = false;
  // Compare against every window regardless of an early match, so the work
  // done doesn't leak which window (if any) was the hit.
  for (const w of [now - 1, now]) {
    const a = Buffer.from(stationCode(stationKey, w));
    const b = Buffer.from(given);
    if (a.length === b.length && timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}

/** Deep link that pre-fills the code, for players who scan the station screen. */
export function stationScanUrl(stepId: string, code: string): string {
  return `${appUrl()}/q/${tagToken(stepId)}?c=${code}`;
}

// ---------------------------------------------------------------------------
// Player passes — the other direction.
//
// At a busy stand it's far quicker for the vendor to scan a queue of phones
// than for each player to read a code off a screen and type it. The player
// shows a pass; the vendor's authenticated device scans it. That device is
// itself the proof of presence, so no station code is involved at all.
//
// The pass rotates so that a screenshot forwarded to a friend across the venue
// is dead within a couple of minutes.
// ---------------------------------------------------------------------------

const PASS_ROTATION_SECONDS = 60;

/** Marker so the scanner can tell a pass from any other QR in the wild. */
const PASS_PREFIX = "MMPASS1";

/**
 * The kind is baked into the pass, not inferred at the far end.
 *
 * A member id and a player id are both opaque UUIDs, so a scanner handed a
 * bare id would have to guess which table to look in — and guessing wrong at a
 * no-data event is precisely the confusion between the two worlds this feature
 * exists to prevent. One character settles it, inside the signature.
 */
const passSubject = (who: Claimant) =>
  who.kind === "member" ? `u${who.userId}` : `p${who.playerId}`;

export function playerPass(who: Claimant, atMs = Date.now()): string {
  const w = windowIndex(PASS_ROTATION_SECONDS, atMs);
  const body = `${passSubject(who)}:${w}`;
  return `${PASS_PREFIX}.${Buffer.from(`${body}:${sig(body)}`).toString(
    "base64url"
  )}`;
}

/** Seconds until the displayed pass rolls over — drives the player's countdown. */
export function passSecondsRemaining(atMs = Date.now()): number {
  const period = PASS_ROTATION_SECONDS * 1000;
  return Math.ceil((period - (atMs % period)) / 1000);
}

export function verifyPlayerPass(
  token: string,
  atMs = Date.now()
): Claimant | null {
  try {
    if (!token.startsWith(`${PASS_PREFIX}.`)) return null;
    const decoded = Buffer.from(
      token.slice(PASS_PREFIX.length + 1),
      "base64url"
    ).toString("utf8");
    const [subject, w, given] = decoded.split(":");
    if (!subject || !w || !given) return null;

    const current = windowIndex(PASS_ROTATION_SECONDS, atMs);
    const minted = Number(w);
    // Look-behind only. A pass is minted server-side and verified server-side
    // on the same clock, so a future window can't legitimately occur — the
    // look-ahead this used to allow only lengthened the life of a forwarded
    // screenshot. `Number.isFinite` guards a non-numeric window, which would
    // otherwise make the comparison NaN and skip the freshness check entirely.
    if (!Number.isFinite(minted)) return null;
    if (minted > current || current - minted > 1) return null;

    const a = Buffer.from(given);
    const b = Buffer.from(sig(`${subject}:${w}`));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const id = subject.slice(1);
    if (!id) return null;
    if (subject[0] === "u") return { kind: "member", userId: id };
    if (subject[0] === "p") return { kind: "player", playerId: id };
    return null;
  } catch {
    return null;
  }
}
