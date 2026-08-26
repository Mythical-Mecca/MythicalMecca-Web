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
  { prefix: "/admin", min: "admin" },
  /**
   * Only "signed in" — deliberately NOT "partner".
   *
   * proxy.ts reads the role straight off the JWT, and the Auth.js jwt callback
   * only refreshes it on sign-in. Someone promoted to partner mid-session (by
   * accepting a team invite, or having an application approved) still carries a
   * `member` token, and gating here would lock them out of the hub they just
   * joined until they signed out. The real gate is a partner_members lookup in
   * app/(partner)/layout.tsx, which is always current.
   */
  { prefix: "/partner-hub", min: "member" },
  { prefix: "/dashboard", min: "member" },
  { prefix: "/profile", min: "member" },
  { prefix: "/apply", min: "member" },
  // Two authenticated sections. /partners used to be listed here, but it is
  // public now — and the rule was dead anyway: proxy.ts's matcher never
  // included /partners, so this table was never consulted for it.
  { prefix: "/events", min: "member" },
  { prefix: "/quests", min: "member" },
  // Tag landing route — scanned from a QR code or NFC tag on the floor.
  { prefix: "/q/", min: "member" },
];

export function ruleForPath(pathname: string) {
  return ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
}
