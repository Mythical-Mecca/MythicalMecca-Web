/**
 * Partner social links.
 *
 * Three shapes exist in the wild and all three have to keep rendering:
 *   1. `{ instagram: "https://…", website: "…" }` — the target shape, already
 *      produced by the application wizard (`SOCIAL_KEYS` in app/(app)/actions.ts).
 *   2. `{ raw: "https://a.com, b.com" }` — what the partner-hub and admin forms
 *      have been writing. Never rendered until now: the reader expected shape 3.
 *   3. `[{ label, url }]` — the shape `samplePartners` uses.
 *
 * `parseSocials` normalises all of them to `SocialLink[]`, so the migration that
 * rewrites stored rows into shape 1 can land later without a flag day.
 */

import { safeHttpUrl } from "@/lib/url";

export type SocialKey =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "x"
  | "facebook"
  | "discord"
  | "etsy"
  | "website";

export interface SocialLink {
  key: SocialKey;
  label: string;
  url: string;
  icon: string;
}

interface Platform {
  label: string;
  icon: string;
  /** Matched against the hostname, not the whole URL. */
  match: RegExp;
}

/**
 * Declaration order is the render order — jsonb does not preserve key order, so
 * sorting by this keeps the button row stable across saves.
 * `website` is the fallback and deliberately matches nothing.
 */
export const SOCIAL_PLATFORMS: Record<SocialKey, Platform> = {
  instagram: { label: "Instagram", icon: "mdi:instagram", match: /(^|\.)instagram\.com$/ },
  youtube: { label: "YouTube", icon: "mdi:youtube", match: /(^|\.)(youtube\.com|youtu\.be)$/ },
  tiktok: { label: "TikTok", icon: "logos:tiktok-icon", match: /(^|\.)tiktok\.com$/ },
  x: { label: "X", icon: "mdi:twitter", match: /(^|\.)(x\.com|twitter\.com)$/ },
  facebook: { label: "Facebook", icon: "mdi:facebook", match: /(^|\.)(facebook\.com|fb\.com)$/ },
  discord: { label: "Discord", icon: "mdi:discord", match: /(^|\.)(discord\.gg|discord\.com)$/ },
  etsy: { label: "Etsy", icon: "mdi:etsy", match: /(^|\.)etsy\.com$/ },
  website: { label: "Website", icon: "mdi:web", match: /(?!)/ },
};

export const SOCIAL_KEYS = Object.keys(SOCIAL_PLATFORMS) as SocialKey[];

const ORDER = new Map(SOCIAL_KEYS.map((k, i) => [k, i]));

/**
 * Normalise a user-supplied link, or null if it isn't a usable http(s) URL.
 * Socials are pasted freeform, so a bare "instagram.com/x" is accepted and
 * given a scheme; anything non-http is rejected outright.
 */
export function safeUrl(input: unknown): string | null {
  return safeHttpUrl(input, { allowBareHost: true });
}

/** Best-guess platform for a URL. Falls back to `website`. */
export function detectPlatform(url: string): SocialKey {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "website";
  }
  for (const key of SOCIAL_KEYS) {
    if (key !== "website" && SOCIAL_PLATFORMS[key].match.test(host)) return key;
  }
  return "website";
}

/** Hostname without `www.` — a more useful label than a generic "Website". */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function toLink(url: string, key?: SocialKey, explicitLabel?: string): SocialLink {
  const resolved = key && key in SOCIAL_PLATFORMS ? key : detectPlatform(url);
  const platform = SOCIAL_PLATFORMS[resolved];
  return {
    key: resolved,
    label: explicitLabel?.trim() || (resolved === "website" ? hostLabel(url) : platform.label),
    url,
    icon: platform.icon,
  };
}

/**
 * Read any stored `partners.socials` value into render-ready links.
 * Unusable entries are dropped rather than thrown on — a bad link saved years
 * ago must not blank the whole partner page.
 */
export function parseSocials(value: unknown): SocialLink[] {
  if (!value) return [];
  const out: SocialLink[] = [];

  if (Array.isArray(value)) {
    // Shape 3: [{ label, url }]
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const { label, url } = entry as { label?: unknown; url?: unknown };
      const safe = safeUrl(url);
      if (safe) out.push(toLink(safe, undefined, typeof label === "string" ? label : undefined));
    }
  } else if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.raw === "string") {
      // Shape 2: one freeform field, comma- or newline-separated.
      for (const part of record.raw.split(/[,\n]/)) {
        const safe = safeUrl(part);
        if (safe) out.push(toLink(safe));
      }
    } else {
      // Shape 1: { [key]: url }
      for (const [key, raw] of Object.entries(record)) {
        const safe = safeUrl(raw);
        if (safe) out.push(toLink(safe, key as SocialKey));
      }
    }
  }

  // Dedupe on URL, then order by platform so the row doesn't reshuffle on save.
  const seen = new Set<string>();
  return out
    .filter((l) => !seen.has(l.url) && seen.add(l.url))
    .sort((a, b) => (ORDER.get(a.key) ?? 99) - (ORDER.get(b.key) ?? 99));
}

/**
 * Collapse links back to the stored `{ [key]: url }` shape. Repeated platforms
 * would collide on the key, so extras fall back to `website`, then are dropped —
 * matching what the keyed column can actually hold.
 */
export function toStoredSocials(links: SocialLink[]): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const l of links) if (!(l.key in out)) out[l.key] = l.url;
  return Object.keys(out).length ? out : null;
}
