import { z } from "zod";

/**
 * Link safety.
 *
 * `z.string().url()` is NOT a safety check — it delegates to `new URL()`, which
 * happily accepts `javascript:alert(1)`, `data:text/html,…` and `vbscript:`.
 * Any user-supplied string that ends up in an `href` therefore has to be
 * scheme-checked separately, or a stored value becomes stored XSS the moment a
 * visitor clicks it.
 */

/**
 * Normalise a link, or null if it isn't a usable http(s) URL.
 *
 * `allowBareHost` accepts "example.com/x" and prefixes https:// — convenient for
 * freeform fields people paste into. A string carrying any other scheme is
 * rejected outright rather than coerced.
 */
export function safeHttpUrl(
  input: unknown,
  opts?: { allowBareHost?: boolean }
): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null;
  if (!hasScheme && !opts?.allowBareHost) return null;

  try {
    const u = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Bare words ("myshop") parse as a hostname but aren't reachable links.
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Zod schema for a link that will be rendered as an `href`. */
export function httpUrl(max = 500) {
  return z
    .string()
    .max(max)
    .refine((v) => safeHttpUrl(v) !== null, {
      message: "Must be an http(s) URL",
    });
}
