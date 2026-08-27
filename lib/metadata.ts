import type { Metadata } from "next";

export const SITE_NAME = "Mythical Mecca";

/**
 * Link previews truncate, and they truncate mid-word. WhatsApp shows roughly
 * two lines, Google around 155 characters, Discord a little more — so anything
 * past ~200 is invisible everywhere and the tail of a long partner bio would
 * just stop mid-sentence. Cut on a word boundary and let the ellipsis say it.
 */
export function clampDescription(text: string, limit = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/**
 * Every shareable page's metadata, built the same way.
 *
 * Next merges metadata *shallowly*: a page that sets `openGraph` replaces the
 * parent's `openGraph` wholesale rather than merging into it, so a page that
 * only wanted its own og:title would silently drop og:site_name and og:type.
 * Building the whole block here — rather than setting defaults in the root
 * layout and overriding per page — is what keeps that from happening.
 *
 * `title` stays plain: the root layout's title template appends the site name
 * for the browser tab, and og:site_name already carries the brand for previews,
 * so putting it in both would read "Contact — Mythical Mecca — Mythical Mecca".
 */
export function pageMetadata({
  title,
  description,
  index = true,
}: {
  title?: string;
  description: string;
  /** Private, token-addressed pages opt out — see partner-invite. */
  index?: boolean;
}): Metadata {
  const desc = clampDescription(description);
  return {
    ...(title ? { title } : {}),
    description: desc,
    ...(index ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      ...(title ? { title } : {}),
      description: desc,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_ZA",
    },
    twitter: {
      card: "summary_large_image",
      ...(title ? { title } : {}),
      description: desc,
    },
  };
}
