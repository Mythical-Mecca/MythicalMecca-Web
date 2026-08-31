import "server-only";

/**
 * Cloudflare Turnstile, the backstop behind the cheap checks in lib/spam.ts.
 *
 * Chosen over reCAPTCHA because it is free at this volume, needs no consent
 * banner, and is invisible for almost every real visitor — the form does not
 * grow a puzzle.
 *
 * Configure with NEXT_PUBLIC_TURNSTILE_SITE_KEY (public, rendered into the
 * widget) and TURNSTILE_SECRET_KEY (server only). Both come from the Turnstile
 * section of the Cloudflare dashboard.
 */

export const TURNSTILE_FIELD = "cf-turnstile-response";

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Off in development, whatever the keys say.
 *
 * Cloudflare's widget script runs its own challenge in an iframe, and that was
 * enough to take down the desktop browser the dev server is previewed in. It
 * also has nothing to protect locally: there are no bots on localhost. Set
 * TURNSTILE_IN_DEV=1 to opt a local run back in when the integration itself
 * is what you are testing.
 */
export function turnstileEnabled(): boolean {
  if (!turnstileConfigured()) return false;
  if (process.env.NODE_ENV === "production") return true;
  return process.env.TURNSTILE_IN_DEV === "1";
}

/**
 * Empty unless the widget should actually render — the form treats an empty
 * key as "draw nothing", so neither the script tag nor the challenge div
 * reaches the page in development.
 */
export function turnstileSiteKey(): string {
  return turnstileEnabled() ? rawSiteKey() : "";
}

function rawSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

/**
 * True once both keys are present.
 *
 * With no keys the widget is not rendered and verification is skipped, so a
 * developer without a Cloudflare account still has a working form. That does
 * mean an unconfigured production deployment has no captcha, which is why
 * {@link verifyTurnstile} says so in the log rather than passing quietly.
 */
export function turnstileConfigured(): boolean {
  return !!(process.env.TURNSTILE_SECRET_KEY && rawSiteKey());
}

export type TurnstileResult = "ok" | "failed" | "skipped";

export async function verifyTurnstile(
  token: string,
  ip?: string | null
): Promise<TurnstileResult> {
  // Mirrors the render side exactly. If no widget was drawn there is no token
  // to check, and verifying anyway would reject every submission in dev.
  if (!turnstileEnabled()) {
    if (!turnstileConfigured()) {
      console.warn(
        "[turnstile] not configured — set NEXT_PUBLIC_TURNSTILE_SITE_KEY and " +
          "TURNSTILE_SECRET_KEY to put a captcha on the public form"
      );
    }
    return "skipped";
  }
  if (!token) return "failed";

  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    });
    if (ip) body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      // Cloudflare being slow must not hold a form submission open forever.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "failed";
    const data = (await res.json()) as { success?: boolean };
    return data.success ? "ok" : "failed";
  } catch {
    // A network blip on our side should not eat somebody's message. The cheap
    // checks have already run by this point, so failing open here costs less
    // than telling a real sender to try again for reasons of our own.
    console.warn("[turnstile] verification unreachable — allowing through");
    return "skipped";
  }
}
