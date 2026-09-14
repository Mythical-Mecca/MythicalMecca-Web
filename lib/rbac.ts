export type Role = "recruit" | "member" | "partner" | "admin";

const ORDER: Record<Role, number> = {
  recruit: 0,
  member: 1,
  partner: 2,
  admin: 3,
};

/**
 * Normalize a stored/JWT role. Tolerates the legacy "vendor" value still living
 * in old JWTs after the vendor→partner rename, so those users aren't locked out
 * until their next sign-in.
 */
export function normalizeRole(role: string | undefined | null): Role {
  if (role === "vendor") return "partner";
  if (role && role in ORDER) return role as Role;
  return "recruit";
}

/** True when `role` meets or exceeds `min` in the hierarchy. */
export function roleAtLeast(
  role: Role | string | undefined | null,
  min: Role
): boolean {
  return ORDER[normalizeRole(role)] >= ORDER[min];
}

/** First path segment → minimum role required. Consumed by proxy.ts. */
export const ROUTE_RULES: { prefix: string; min: Role }[] = [
  /**
   * Only "signed in" — same reasoning as /partner-hub below.
   *
   * Roles are edited from /admin/users while people are signed in, and the
   * role claim in the session cookie is only re-minted at sign-in: `auth()`
   * refreshes the role it hands the server (lib/auth.ts) but a React Server
   * Component can't write the refreshed cookie back. Gating on "admin" here
   * would therefore lock a just-promoted admin out of the panel they were
   * just given, until they signed out and in again. The real gate is
   * `requireRole("admin")` in app/(admin)/layout.tsx, which reads the live
   * role and runs on every admin page.
   */
  { prefix: "/admin", min: "member" },
  /**
   * Only "signed in" — deliberately NOT "partner".
   *
   * proxy.ts reads the role straight off the JWT, and the cookie's role claim
   * is only re-minted at sign-in. Someone promoted to partner mid-session (by
   * accepting a team invite, or having an application approved) still carries a
   * `member` token, and gating here would lock them out of the hub they just
   * joined until they signed out. The real gate is a partner_members lookup in
   * app/(partner)/layout.tsx, which is always current.
   */
  { prefix: "/partner-hub", min: "member" },
  { prefix: "/apply", min: "member" },
];

export function ruleForPath(pathname: string) {
  return ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
}
