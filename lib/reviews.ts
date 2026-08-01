import "server-only";
import { db } from "@/lib/db";
import { reviews, users, partners } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

const useDb = !!process.env.DATABASE_URL;

export const ANON_NAME = "Anonymous adventurer";

export interface ReviewView {
  id: string;
  rating: number;
  body: string | null;
  isAnonymous: boolean;
  authorName: string;
  createdAt: string;
  targetType: "site" | "partner";
  targetId: string | null;
  partnerName?: string | null;
  partnerSlug?: string | null;
  status: "draft" | "pending" | "approved" | "rejected";
  featured: boolean;
}

const displayName = (name: string | null, anon: boolean) =>
  anon ? ANON_NAME : name?.trim() || "Adventurer";

/** Approved reviews for one partner, newest first. */
export async function listPartnerReviews(partnerId: string): Promise<ReviewView[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ r: reviews, name: users.name })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.targetType, "partner"),
          eq(reviews.targetId, partnerId),
          eq(reviews.status, "approved")
        )
      )
      .orderBy(desc(reviews.createdAt));
    return rows.map(({ r, name }) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      isAnonymous: r.isAnonymous,
      authorName: displayName(name, r.isAnonymous),
      createdAt: r.createdAt.toISOString().slice(0, 10),
      targetType: r.targetType,
      targetId: r.targetId,
      status: r.status,
      featured: r.featured,
    }));
  } catch {
    return [];
  }
}

export interface ReviewSummary {
  count: number;
  average: number;
}

export async function getPartnerReviewSummary(
  partnerId: string
): Promise<ReviewSummary> {
  if (!useDb) return { count: 0, average: 0 };
  try {
    const [row] = await db
      .select({
        count: sql<number>`count(*)`,
        average: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.targetType, "partner"),
          eq(reviews.targetId, partnerId),
          eq(reviews.status, "approved")
        )
      );
    return {
      count: Number(row?.count ?? 0),
      average: Math.round(Number(row?.average ?? 0) * 10) / 10,
    };
  } catch {
    return { count: 0, average: 0 };
  }
}

/** Admin moderation list, filtered by status. */
export async function listReviewsForAdmin(
  status?: "pending" | "approved" | "rejected"
): Promise<ReviewView[]> {
  if (!useDb) return [];
  try {
    const where = status ? eq(reviews.status, status) : undefined;
    const rows = await db
      .select({ r: reviews, name: users.name, pName: partners.businessName, pSlug: partners.slug })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(
        partners,
        and(eq(reviews.targetType, "partner"), eq(reviews.targetId, sql`${partners.id}::text`))
      )
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(200);
    return rows.map(({ r, name, pName, pSlug }) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      isAnonymous: r.isAnonymous,
      // Admins always see the real author even when the review is anonymous.
      authorName: name?.trim() || "Adventurer",
      createdAt: r.createdAt.toISOString().slice(0, 10),
      targetType: r.targetType,
      targetId: r.targetId,
      partnerName: pName,
      partnerSlug: pSlug,
      status: r.status,
      featured: r.featured,
    }));
  } catch {
    return [];
  }
}
