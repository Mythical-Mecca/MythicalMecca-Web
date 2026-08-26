import "server-only";
import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { partners, partnerMembers } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";

/**
 * Partner access control.
 *
 * A user may manage several partner pages, and a page may be managed by several
 * users, so ownership lives in `partner_members` rather than on the partner row.
 *
 * This module — NOT the JWT role — is the authoritative gate. The Auth.js `jwt`
 * callback only reads `users.role` on initial sign-in (lib/auth.ts), so someone
 * promoted to `partner` mid-session carries a stale `member` token until they
 * sign out. Gating on that role would mean an invited teammate is locked out of
 * the hub they just accepted. A membership lookup is always current, and the
 * partner-hub pages need the rows anyway.
 *
 * Site admins are the exception: `token.role` is re-derived from ADMIN_EMAILS on
 * every JWT callback, so it is safe to trust, and admins get a synthetic owner
 * membership for any partner (mirrors lib/station-access.ts).
 */

export type PartnerRole = "owner" | "manager";
export type PartnerStatus = "draft" | "pending" | "approved" | "rejected";

export interface PartnerMembership {
  partnerId: string;
  slug: string;
  businessName: string;
  status: PartnerStatus;
  active: boolean;
  categoryId: string | null;
  /** "owner" is synthesised for site admins. */
  role: PartnerRole;
  /** True when access came from the admin bypass, not a real membership row. */
  viaAdmin: boolean;
}

const MEMBER_ORDER: Record<PartnerRole, number> = { manager: 0, owner: 1 };

/** True when `role` meets or exceeds `min` within a single partner. */
export function partnerRoleAtLeast(role: PartnerRole, min: PartnerRole): boolean {
  return MEMBER_ORDER[role] >= MEMBER_ORDER[min];
}

const useDb = !!process.env.DATABASE_URL;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres errors on a malformed uuid — reject before it reaches the driver. */
function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Every partner this user can manage. Owners first, then alphabetical. */
export async function listMyPartners(
  userId: string
): Promise<PartnerMembership[]> {
  if (!useDb || !userId) return [];
  try {
    const rows = await db
      .select({ p: partners, role: partnerMembers.role })
      .from(partnerMembers)
      .innerJoin(partners, eq(partnerMembers.partnerId, partners.id))
      .where(eq(partnerMembers.userId, userId))
      .orderBy(asc(partners.businessName));
    return rows
      .map(({ p, role }) => ({
        partnerId: p.id,
        slug: p.slug,
        businessName: p.businessName,
        status: p.status,
        active: p.active,
        categoryId: p.categoryId,
        role,
        viaAdmin: false,
      }))
      .sort((a, b) => MEMBER_ORDER[b.role] - MEMBER_ORDER[a.role]);
  } catch {
    return [];
  }
}

/**
 * Cheap indexed count, backed by partner_members_user_idx. Powers nav flags on
 * authenticated pages, so it must stay a single count — never a full list.
 */
export async function countMyPartnerships(userId: string): Promise<number> {
  if (!useDb || !userId) return 0;
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(partnerMembers)
      .where(eq(partnerMembers.userId, userId));
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

/**
 * The authoritative access check for one partner. Returns null when the user
 * has no membership meeting `min` and isn't a site admin.
 *
 * Pass `role` (the session role) to enable the admin bypass; omit it for a
 * strict membership-only check.
 */
export async function getMembership(
  userId: string,
  partnerId: string,
  role?: Role | string | null,
  min: PartnerRole = "manager"
): Promise<PartnerMembership | null> {
  if (!useDb || !userId || !isUuid(partnerId)) return null;
  const isAdmin = roleAtLeast(role, "admin");
  try {
    const [row] = await db
      .select({ p: partners, memberRole: partnerMembers.role })
      .from(partners)
      .leftJoin(
        partnerMembers,
        and(
          eq(partnerMembers.partnerId, partners.id),
          eq(partnerMembers.userId, userId)
        )
      )
      .where(eq(partners.id, partnerId))
      .limit(1);
    if (!row) return null;

    /**
     * Admins act as owner on any partner — including one where they happen to
     * hold a `manager` row. Reporting their real row there would let them pass
     * an owner-only action guard while the UI hid the owner controls, which
     * reads as a bug rather than a permission.
     */
    if (!isAdmin && !row.memberRole) return null;
    const effective: PartnerRole = isAdmin ? "owner" : row.memberRole!;
    if (!partnerRoleAtLeast(effective, min)) return null;

    const { p } = row;
    return {
      partnerId: p.id,
      slug: p.slug,
      businessName: p.businessName,
      status: p.status,
      active: p.active,
      categoryId: p.categoryId,
      role: effective,
      viaAdmin: isAdmin && !row.memberRole,
    };
  } catch {
    return null;
  }
}

/**
 * Page/layout guard: redirects instead of returning null.
 *
 * NOTE this is a UX guard only. A layout does not re-run when a server action is
 * invoked, so every action must call `authorizePartnerAction` independently.
 */
export async function requirePartnerAccess(
  partnerId: string,
  min: PartnerRole = "manager"
): Promise<{ session: Session; membership: PartnerMembership }> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const membership = await getMembership(
    session.user.id,
    partnerId,
    session.user.role,
    min
  );
  if (!membership) redirect("/partner-hub?denied=1");
  return { session, membership };
}

/**
 * Server-action guard. Reads `partnerId` off the submitted FormData and proves
 * the caller may act on it — a hand-posted id for someone else's partner fails
 * here. Returns null so the caller can redirect with its own error target.
 */
export async function authorizePartnerAction(
  formData: FormData,
  min: PartnerRole = "manager"
): Promise<{ session: Session; membership: PartnerMembership } | null> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const partnerId = String(formData.get("partnerId") ?? "");
  const membership = await getMembership(
    session.user.id,
    partnerId,
    session.user.role,
    min
  );
  return membership ? { session, membership } : null;
}
