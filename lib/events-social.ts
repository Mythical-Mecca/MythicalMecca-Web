import "server-only";
import { db } from "@/lib/db";
import { events, eventComments, eventReviews, users } from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

const useDb = !!process.env.DATABASE_URL;

export interface CommentView {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}
export interface ReviewView {
  id: string;
  author: string;
  rating: number;
  body: string | null;
  createdAt: string;
}
export interface ReviewSummary {
  count: number;
  avg: number;
}

export async function eventIdBySlug(slug: string): Promise<string | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);
    return row?.id ?? null;
  } catch {
    return null;
  }
}

export async function getComments(slug: string): Promise<CommentView[]> {
  if (!useDb) return [];
  try {
    const id = await eventIdBySlug(slug);
    if (!id) return [];
    const rows = await db
      .select({
        id: eventComments.id,
        body: eventComments.body,
        createdAt: eventComments.createdAt,
        author: users.name,
      })
      .from(eventComments)
      .leftJoin(users, eq(users.id, eventComments.userId))
      .where(
        and(eq(eventComments.eventId, id), isNull(eventComments.deletedAt))
      )
      .orderBy(desc(eventComments.createdAt));
    return rows.map((r) => ({
      id: r.id,
      author: r.author ?? "Pilot",
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getReviews(slug: string): Promise<ReviewView[]> {
  if (!useDb) return [];
  try {
    const id = await eventIdBySlug(slug);
    if (!id) return [];
    const rows = await db
      .select({
        id: eventReviews.id,
        rating: eventReviews.rating,
        body: eventReviews.body,
        createdAt: eventReviews.createdAt,
        author: users.name,
      })
      .from(eventReviews)
      .leftJoin(users, eq(users.id, eventReviews.userId))
      .where(eq(eventReviews.eventId, id))
      .orderBy(desc(eventReviews.createdAt));
    return rows.map((r) => ({
      id: r.id,
      author: r.author ?? "Pilot",
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getReviewSummary(slug: string): Promise<ReviewSummary> {
  if (!useDb) return { count: 0, avg: 0 };
  try {
    const id = await eventIdBySlug(slug);
    if (!id) return { count: 0, avg: 0 };
    const [row] = await db
      .select({
        count: sql<number>`count(*)`,
        avg: sql<number>`coalesce(avg(${eventReviews.rating}), 0)`,
      })
      .from(eventReviews)
      .where(eq(eventReviews.eventId, id));
    return {
      count: Number(row?.count ?? 0),
      avg: Math.round((Number(row?.avg ?? 0) + Number.EPSILON) * 10) / 10,
    };
  } catch {
    return { count: 0, avg: 0 };
  }
}
