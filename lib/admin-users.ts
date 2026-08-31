import "server-only";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { isAllowlistedAdmin } from "@/lib/admin-emails";
import { toMediaSrc } from "@/lib/media";

const useDb = !!process.env.DATABASE_URL;

/** The roles an admin can actually assign — `recruit` is the signed-out state. */
export const ASSIGNABLE_ROLES = ["member", "partner", "admin"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface AdminMember {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: AssignableRole;
  /** Sign-in providers linked to the account, e.g. "google, discord". */
  providers: string;
  banned: boolean;
  bannedAt: string | null;
  bannedReason: string | null;
  /** Who did the banning — null once that admin's own account is deleted. */
  bannedByName: string | null;
  /**
   * Admin by ADMIN_EMAILS rather than by stored role. Their `role` column is
   * decorative, so the screen shows this instead of pretending it's editable.
   */
  allowlisted: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

/**
 * Every account, for the members screen.
 *
 * One query: the ban's author is joined through an alias of the same table,
 * and linked providers are aggregated rather than fetched per row — an admin
 * wants to see at a glance whether a member signs in with Discord or Google
 * before deciding what a duplicate-looking account is.
 */
export async function listMembers(): Promise<AdminMember[]> {
  if (!useDb) return [];
  const bannedBy = alias(users, "banned_by_user");
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        image: users.image,
        role: users.role,
        bannedAt: users.bannedAt,
        bannedReason: users.bannedReason,
        bannedByName: bannedBy.name,
        bannedByEmail: bannedBy.email,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
        providers: sql<string | null>`string_agg(distinct ${accounts.provider}, ', ')`,
      })
      .from(users)
      .leftJoin(bannedBy, eq(users.bannedBy, bannedBy.id))
      .leftJoin(accounts, eq(accounts.userId, users.id))
      .groupBy(users.id, bannedBy.name, bannedBy.email)
      .orderBy(desc(users.createdAt), asc(users.id));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      avatarUrl: r.avatarUrl ? toMediaSrc(r.avatarUrl) : r.image,
      role: r.role,
      providers: r.providers ?? "",
      banned: !!r.bannedAt,
      bannedAt: r.bannedAt ? r.bannedAt.toISOString() : null,
      bannedReason: r.bannedReason,
      bannedByName: r.bannedByName ?? r.bannedByEmail ?? null,
      allowlisted: isAllowlistedAdmin(r.email),
      createdAt: r.createdAt.toISOString(),
      lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null,
    }));
  } catch {
    return [];
  }
}
