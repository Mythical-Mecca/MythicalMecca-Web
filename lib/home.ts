import "server-only";
import { roleAtLeast, type Role } from "@/lib/rbac";
import { countMyPartnerships } from "@/lib/partner-access";
import { isSafePath } from "@/lib/return-to";

/**
 * Retired member-app landings. Detail URLs like `/events/[slug]` and
 * `/quests/[slug]` stay public; only the boards and the old guild-hall
 * screens are gone.
 */
const RETIRED = new Set([
  "/dashboard",
  "/profile",
  "/events",
  "/quests",
  "/events/submit",
]);

function pathOnly(href: string): string {
  const q = href.indexOf("?");
  const h = href.indexOf("#");
  let end = href.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return href.slice(0, end);
}

export function isRetiredMemberPath(href: string): boolean {
  return RETIRED.has(pathOnly(href));
}

/** Keepers and stallholders — everyone else browses the public site. */
export async function isStaffUser(
  userId: string,
  role: Role | string | undefined | null
): Promise<boolean> {
  if (roleAtLeast(role, "admin")) return true;
  return (await countMyPartnerships(userId)) > 0;
}

/**
 * Where a signed-in account should land. Honours a safe `from` unless it
 * points at a retired member page; otherwise admin → `/admin`, stallholder
 * → `/partner-hub`, visitor → `/`.
 */
export async function homeForUser(
  user: { id: string; role?: Role | string },
  from?: string | null
): Promise<string> {
  if (from && isSafePath(from) && !isRetiredMemberPath(from)) return from;
  if (roleAtLeast(user.role, "admin")) return "/admin";
  if ((await countMyPartnerships(user.id)) > 0) return "/partner-hub";
  return "/";
}

export function continueHref(from?: string | null): string {
  if (from && isSafePath(from)) {
    return `/auth/continue?from=${encodeURIComponent(from)}`;
  }
  return "/auth/continue";
}
