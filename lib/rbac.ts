export type Role = "recruit" | "member" | "vendor" | "admin";

const ORDER: Record<Role, number> = {
  recruit: 0,
  member: 1,
  vendor: 2,
  admin: 3,
};

/** True when `role` meets or exceeds `min` in the hierarchy. */
export function roleAtLeast(role: Role | undefined | null, min: Role): boolean {
  return ORDER[role ?? "recruit"] >= ORDER[min];
}

/** First path segment → minimum role required. Consumed by proxy.ts. */
export const ROUTE_RULES: { prefix: string; min: Role }[] = [
  { prefix: "/command", min: "admin" },
  { prefix: "/forge", min: "vendor" },
  { prefix: "/dashboard", min: "member" },
  { prefix: "/profile", min: "member" },
];

export function ruleForPath(pathname: string) {
  return ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
}
