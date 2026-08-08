import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerInvites, partnerMembers, partners, users } from "@/lib/db/schema";
import { absoluteUrl } from "@/lib/mail";
import type { PartnerRole } from "@/lib/partner-access";

/**
 * Team invitations.
 *
 * The raw token is never stored — only its sha256. Lookup is therefore a hash
 * index probe rather than a string comparison, which sidesteps timing concerns
 * entirely. Expiry is derived at read time from `expiresAt`; there is no cron
 * in this app to sweep a stored `expired` state, and a stale flag would be
 * worse than no flag.
 */

const useDb = !!process.env.DATABASE_URL;

const TOKEN_BYTES = 32;
export const INVITE_TTL_DAYS = 14;

export function newInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function inviteUrl(raw: string): string {
  return absoluteUrl(`/partner-invite/${raw}`);
}

export function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export interface InviteView {
  id: string;
  partnerId: string;
  partnerName: string;
  email: string | null;
  invitedUserId: string | null;
  role: PartnerRole;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  /** Derived, not stored. */
  expired: boolean;
  createdAt: string;
  inviterName: string | null;
}

type InviteRow = typeof partnerInvites.$inferSelect;

function toView(
  i: InviteRow,
  partnerName: string,
  inviterName: string | null
): InviteView {
  return {
    id: i.id,
    partnerId: i.partnerId,
    partnerName,
    email: i.email,
    invitedUserId: i.invitedUserId,
    role: i.role,
    status: i.status,
    expiresAt: i.expiresAt.toISOString(),
    expired: i.expiresAt.getTime() < Date.now(),
    createdAt: i.createdAt.toISOString(),
    inviterName,
  };
}

/** Resolve a raw token from an invite link. Null when it doesn't exist. */
export async function findInviteByToken(
  raw: string
): Promise<InviteView | null> {
  if (!useDb || !raw) return null;
  try {
    const [row] = await db
      .select({ i: partnerInvites, partnerName: partners.businessName })
      .from(partnerInvites)
      .innerJoin(partners, eq(partnerInvites.partnerId, partners.id))
      .where(eq(partnerInvites.tokenHash, hashToken(raw)))
      .limit(1);
    if (!row) return null;

    let inviterName: string | null = null;
    if (row.i.invitedBy) {
      const [u] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, row.i.invitedBy))
        .limit(1);
      inviterName = u?.name ?? null;
    }
    return toView(row.i, row.partnerName, inviterName);
  } catch {
    return null;
  }
}

/** Outstanding invitations for one stall — the team page. */
export async function listInvitesForPartner(
  partnerId: string
): Promise<InviteView[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ i: partnerInvites, partnerName: partners.businessName })
      .from(partnerInvites)
      .innerJoin(partners, eq(partnerInvites.partnerId, partners.id))
      .where(
        and(
          eq(partnerInvites.partnerId, partnerId),
          eq(partnerInvites.status, "pending")
        )
      )
      .orderBy(desc(partnerInvites.createdAt));
    return rows.map((r) => toView(r.i, r.partnerName, null));
  } catch {
    return [];
  }
}

/**
 * Invitations this user can accept right now — matched either by account or by
 * the address they signed in with. This is what makes invites usable with no
 * mail provider: an existing member just sees the card in their hub.
 */
export async function listPendingInvitesForUser(
  userId: string,
  email: string | null
): Promise<InviteView[]> {
  if (!useDb || !userId) return [];
  try {
    const identity = email
      ? or(
          eq(partnerInvites.invitedUserId, userId),
          eq(sql`lower(${partnerInvites.email})`, email.toLowerCase())
        )
      : eq(partnerInvites.invitedUserId, userId);

    const rows = await db
      .select({ i: partnerInvites, partnerName: partners.businessName })
      .from(partnerInvites)
      .innerJoin(partners, eq(partnerInvites.partnerId, partners.id))
      .where(
        and(
          eq(partnerInvites.status, "pending"),
          sql`${partnerInvites.expiresAt} > now()`,
          identity
        )
      )
      .orderBy(desc(partnerInvites.createdAt));
    return rows.map((r) => toView(r.i, r.partnerName, null));
  } catch {
    return [];
  }
}

export interface PartnerMemberView {
  userId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: PartnerRole;
  since: string;
}

export async function listPartnerMembers(
  partnerId: string
): Promise<PartnerMemberView[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ m: partnerMembers, u: users })
      .from(partnerMembers)
      .innerJoin(users, eq(partnerMembers.userId, users.id))
      .where(eq(partnerMembers.partnerId, partnerId))
      .orderBy(
        // Owners first, then longest-standing.
        sql`case when ${partnerMembers.role} = 'owner' then 0 else 1 end`,
        asc(partnerMembers.createdAt)
      );
    return rows.map(({ m, u }) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: m.role,
      since: m.createdAt.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

/** How many owners a stall has — the last one may not be removed or demoted. */
export async function countOwners(partnerId: string): Promise<number> {
  if (!useDb) return 0;
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(partnerMembers)
      .where(
        and(
          eq(partnerMembers.partnerId, partnerId),
          eq(partnerMembers.role, "owner")
        )
      );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

/** Live (pending, unexpired) invitations for a stall — used for the cap. */
export async function countPendingInvites(partnerId: string): Promise<number> {
  if (!useDb) return 0;
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(partnerInvites)
      .where(
        and(
          eq(partnerInvites.partnerId, partnerId),
          eq(partnerInvites.status, "pending"),
          sql`${partnerInvites.expiresAt} > now()`
        )
      );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

/** Find an account by email, so an invite can bind to it immediately. */
export async function findUserByEmail(
  email: string
): Promise<{ id: string } | null> {
  if (!useDb) return null;
  try {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1);
    return u ?? null;
  } catch {
    return null;
  }
}

/** True when this user already manages the stall. */
export async function isAlreadyMember(
  partnerId: string,
  userId: string
): Promise<boolean> {
  if (!useDb) return false;
  try {
    const [row] = await db
      .select({ id: partnerMembers.id })
      .from(partnerMembers)
      .where(
        and(
          eq(partnerMembers.partnerId, partnerId),
          eq(partnerMembers.userId, userId)
        )
      )
      .limit(1);
    return !!row;
  } catch {
    return false;
  }
}

/** A live invite already outstanding for this address on this stall. */
export async function hasLiveInviteFor(
  partnerId: string,
  email: string | null,
  invitedUserId: string | null
): Promise<boolean> {
  if (!useDb) return false;
  if (!email && !invitedUserId) return false;
  try {
    const identity = email
      ? eq(sql`lower(${partnerInvites.email})`, email.toLowerCase())
      : and(
          eq(partnerInvites.invitedUserId, invitedUserId!),
          isNull(partnerInvites.email)
        );
    const [row] = await db
      .select({ id: partnerInvites.id })
      .from(partnerInvites)
      .where(
        and(
          eq(partnerInvites.partnerId, partnerId),
          eq(partnerInvites.status, "pending"),
          sql`${partnerInvites.expiresAt} > now()`,
          identity
        )
      )
      .limit(1);
    return !!row;
  } catch {
    return false;
  }
}
