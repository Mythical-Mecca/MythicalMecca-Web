import "server-only";
import { db } from "@/lib/db";
import { users, vendorApplications } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

const useDb = !!process.env.DATABASE_URL;

export type AppStatus = "pending" | "approved" | "rejected";

export interface MyApplication {
  status: AppStatus;
  businessName: string | null;
  pitch: string;
  images: string[];
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
      status: r.status,
      businessName: r.businessName,
      pitch: r.pitch,
      images: (r.images as string[] | null) ?? [],
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
      avatarUrl: r.avatarUrl,
      bannerUrl: r.bannerUrl,
    };
  } catch {
    return null;
  }
}
