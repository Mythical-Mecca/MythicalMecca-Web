/**
 * "Take me back to where I actually came from."
 *
 * Detail screens are reachable from more than one place: a quest opens from
 * the quest list, from the event it belongs to, or from a print sheet, and a
 * back link hard-coded to "All quests" is wrong for two of those three. It sent
 * you to a list you were never on and lost the tab you had open.
 *
 * So the *linking* page says where it is, and the destination reads it back.
 * Two query params rather than one, because a bare path can't be turned into a
 * name a reader recognises — "/admin/events/9f3c…?tab=quests" is not a label,
 * "Comicon JHB" is.
 */
export interface ReturnTo {
  href: string;
  label: string;
}

/** Longest path we will echo into a link. Well past any real route. */
const MAX_HREF = 512;
const MAX_LABEL = 60;

/**
 * Is this a path we're willing to send someone to?
 *
 * Only same-origin, absolute-from-root paths. Anything that could leave the
 * site — a full URL, a protocol-relative `//evil.test`, a backslash that some
 * parsers treat as a slash — falls back instead. The value arrives in a query
 * string, so it is attacker-controllable even on an admin-only screen, and an
 * open redirect is an open redirect.
 */
function isSafePath(v: string): boolean {
  if (!v || v.length > MAX_HREF) return false;
  if (!v.startsWith("/")) return false;
  if (v.startsWith("//") || v.startsWith("/\\")) return false;
  if (v.includes("\\")) return false;
  // Control characters can be used to smuggle a newline past a naive parser.
  if (/[\x00-\x1f\x7f]/.test(v)) return false;
  return true;
}

function cleanLabel(v: string | undefined): string | null {
  if (!v) return null;
  const trimmed = v.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_LABEL
    ? `${trimmed.slice(0, MAX_LABEL - 1)}…`
    : trimmed;
}

/**
 * Append the current location to a link, so the page it opens can come back.
 * Returns `target` untouched when there is nothing worth remembering.
 */
export function withReturn(target: string, from?: ReturnTo | null): string {
  if (!from || !isSafePath(from.href)) return target;
  const sep = target.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ from: from.href });
  const label = cleanLabel(from.label);
  if (label) params.set("fromLabel", label);
  return `${target}${sep}${params.toString()}`;
}

/**
 * Read the return target back out of a page's search params, falling back to
 * that page's own default when there isn't one (or it doesn't look safe).
 */
export function parseReturn(
  sp: { from?: string; fromLabel?: string },
  fallback: ReturnTo
): ReturnTo {
  if (!sp.from || !isSafePath(sp.from)) return fallback;
  const label = cleanLabel(sp.fromLabel);
  return { href: sp.from, label: label ? `Back to ${label}` : "Back" };
}

/**
 * Carry an existing return target one hop further, so quest → tags → back
 * lands on the quest with its own back link still pointing at the event.
 */
export function forwardReturn(
  target: string,
  sp: { from?: string; fromLabel?: string }
): string {
  if (!sp.from || !isSafePath(sp.from)) return target;
  return withReturn(target, { href: sp.from, label: sp.fromLabel ?? "" });
}
