import "server-only";
import { db } from "@/lib/db";
import { users, xpLedger, userBadges, badges } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface Rank {
  name: string;
  min: number;
}

export const RANKS: Rank[] = [
  { name: "Novice", min: 0 },
  { name: "Squire", min: 100 },
  { name: "Knight", min: 300 },
  { name: "Champion", min: 700 },
  { name: "Legend", min: 1500 },
];

export interface RankInfo {
  rank: string;
  next: string | null;
  pct: number;
  toNext: number;
}

export function rankForXp(xp: number): RankInfo {
  let current = RANKS[0];
  for (const r of RANKS) if (xp >= r.min) current = r;
  const idx = RANKS.findIndex((r) => r.name === current.name);
  const next = RANKS[idx + 1] ?? null;
  const pct = next
    ? Math.min(
        100,
        Math.round(((xp - current.min) / (next.min - current.min)) * 100)
      )
    : 100;
  return {
    rank: current.name,
    next: next?.name ?? null,
    pct,
    toNext: next ? next.min - xp : 0,
  };
}

export async function awardXp(
  userId: string,
  delta: number,
  reason: string,
  refType?: string,
  refId?: string
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await db.insert(xpLedger).values({ userId, delta, reason, refType, refId });
    await db
      .update(users)
      .set({ xp: sql`${users.xp} + ${delta}` })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error("[awardXp] failed", err);
  }
}

/** Award a badge by code if the user doesn't already have it. */
export async function awardBadge(userId: string, code: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const [b] = await db
      .select({ id: badges.id })
      .from(badges)
      .where(eq(badges.code, code))
      .limit(1);
    if (!b) return;
    await db
      .insert(userBadges)
      .values({ userId, badgeId: b.id })
      .onConflictDoNothing();
  } catch (err) {
    console.error("[awardBadge] failed", err);
  }
}

export interface BadgeView {
  code: string;
  name: string;
  tier: string;
}

export async function getUserBadges(userId: string): Promise<BadgeView[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await db
      .select({ code: badges.code, name: badges.name, tier: badges.tier })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId));
    return rows;
  } catch {
    return [];
  }
}

export async function getUserXp(userId: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const [u] = await db
      .select({ xp: users.xp })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return u?.xp ?? 0;
  } catch {
    return 0;
  }
}
