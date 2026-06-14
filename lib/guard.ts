import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";

/**
 * Server-side authorization for guarded route groups (defense in depth on top
 * of proxy.ts). Returns the session, or redirects.
 */
export async function requireRole(min: Role) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, min)) redirect("/dashboard?denied=1");
  return session;
}
