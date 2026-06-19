import "server-only";
import { db } from "@/lib/db";
import { users, vendorApplications, accounts } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { toMediaSrc } from "@/lib/media";

const useDb = !!process.env.DATABASE_URL;

export type AppStatus = "draft" | "pending" | "approved" | "rejected";

export interface MyApplication {
  id: string;
  status: AppStatus;
  businessName: string | null;
  pitch: string;
  images: string[];
  socials: Record<string, string>;
  reviewNote: string | null;
  createdAt: string;
}

export async function getMyApplication(
  userId: string
): Promise<MyApplication | null> {
  if (!useDb) return null;
  try {
    const rows = await db
      .select()
      .from(vendorApplications)
      .where(eq(vendorApplications.userId, userId))
      .orderBy(desc(vendorApplications.createdAt))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      status: r.status,
      businessName: r.businessName,
      pitch: r.pitch,
      images: ((r.images as string[] | null) ?? []).map((u) => toMediaSrc(u)),
      socials: (r.socials as Record<string, string> | null) ?? {},
      reviewNote: r.reviewNote,
      createdAt: r.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export interface MyProfile {
  name: string | null;
  xp: number;
  rank: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

/** OAuth providers currently linked to this account (e.g. ["google","discord"]). */
export async function getLinkedAccounts(userId: string): Promise<string[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    return rows.map((r) => r.provider);
  } catch {
    return [];
  }
}

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  if (!useDb) return null;
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      name: r.name,
      xp: r.xp,
      rank: r.rank,
      avatarUrl: toMediaSrc(r.avatarUrl),
      bannerUrl: toMediaSrc(r.bannerUrl),
    };
  } catch {
    return null;
  }
}
