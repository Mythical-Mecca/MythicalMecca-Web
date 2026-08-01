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
  { prefix: "/partner-hub", min: "partner" },
  { prefix: "/dashboard", min: "member" },
  { prefix: "/profile", min: "member" },
  { prefix: "/apply", min: "member" },
  // Three authenticated sections. Strict one-pager public site: only "/",
  // "/login" and "/collab" stay open.
  { prefix: "/partners", min: "member" },
  { prefix: "/events", min: "member" },
  { prefix: "/quests", min: "member" },
  // Tag landing route — scanned from a QR code or NFC tag on the floor.
  { prefix: "/q/", min: "member" },
];

export function ruleForPath(pathname: string) {
  return ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
}
