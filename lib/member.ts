import "server-only";
import { db } from "@/lib/db";
import { partnerApplications } from "@/lib/db/schema";
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
      .from(partnerApplications)
      .where(eq(partnerApplications.userId, userId))
      .orderBy(desc(partnerApplications.createdAt))
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

