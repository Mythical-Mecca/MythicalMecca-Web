import "server-only";
import { db } from "@/lib/db";
import {
  events,
  partners,
  partnerApplications,
  activityLog,
  errorLog,
  pageHits,
  users,
  galleryItems,
} from "@/lib/db/schema";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { sampleEvents } from "@/lib/content";
import { toMediaSrc } from "@/lib/media";

const useDb = !!process.env.DATABASE_URL;

function sampleAdminEvents(): AdminEvent[] {
  return sampleEvents.map((e, i) => ({
    id: `sample-${i}`,
    title: e.title,
    slug: e.slug,
    status: e.status,
    location: e.location,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
  }));
}

export interface AdminEvent {
  id: string;
  title: string;
  slug: string;
  status: string;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
}
export interface AdminApplication {
  id: string;
  businessName: string | null;
  pitch: string;
  images: string[];
  socials: Record<string, string>;
  status: string;
  userId: string;
  createdAt: string;
}
export interface LogRow {
  id: string;
  primary: string;
  secondary: string;
  createdAt: string;
}

export async function listEvents(): Promise<AdminEvent[]> {
  if (!useDb) return sampleAdminEvents();
  try {
    const rows = await db.select().from(events).orderBy(desc(events.createdAt));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      location: r.location,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
    }));
  } catch {
    return sampleAdminEvents();
  }
}

export interface CommunityEventSubmission {
  id: string;
  title: string;
  slug: string;
  summary: string;
  bodyMd: string;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  submitterName: string;
  reviewNote: string | null;
  createdAt: string;
}

/** Community-submitted events for the moderation queue. */
export async function listCommunityEventSubmissions(
  status?: "pending" | "published" | "rejected"
): Promise<CommunityEventSubmission[]> {
  if (!useDb) return [];
  try {
    const where = status
      ? and(eq(events.origin, "community"), eq(events.status, status))
      : eq(events.origin, "community");
    const rows = await db
      .select({ e: events, submitterName: users.name })
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .where(where)
      .orderBy(desc(events.createdAt));
    return rows.map(({ e, submitterName }) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      summary: e.summary ?? "",
      bodyMd: e.bodyMd ?? "",
      location: e.location,
      startsAt: e.startsAt ? e.startsAt.toISOString() : null,
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      status: e.status,
      submitterName: submitterName ?? "Unknown adventurer",
      reviewNote: e.reviewNote,
      createdAt: e.createdAt.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

export interface AdminGalleryItem {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export async function listGallery(): Promise<AdminGalleryItem[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(galleryItems)
      .orderBy(galleryItems.sort, desc(galleryItems.createdAt));
    return rows.map((r) => ({
      id: r.id,
      imageUrl: toMediaSrc(r.imageUrl),
      caption: r.caption,
    }));
  } catch {
    return [];
  }
}

export async function listApplications(): Promise<AdminApplication[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(partnerApplications)
      .where(ne(partnerApplications.status, "draft"))
      .orderBy(desc(partnerApplications.createdAt));
    return rows.map((r) => ({
      id: r.id,
      businessName: r.businessName,
      pitch: r.pitch,
      images: ((r.images as string[] | null) ?? []).map((u) => toMediaSrc(u)),
      socials: (r.socials as Record<string, string> | null) ?? {},
      status: r.status,
      userId: r.userId,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

export async function recentActivity(limit = 50): Promise<LogRow[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      primary: r.action,
      secondary: `${r.entityType ?? ""} ${r.actorId ?? "anon"}`.trim(),
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function recentErrors(limit = 50): Promise<LogRow[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(errorLog)
      .orderBy(desc(errorLog.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      primary: `[${r.level}] ${r.message}`,
      secondary: r.route ?? "",
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function recentHits(limit = 50): Promise<LogRow[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(pageHits)
      .orderBy(desc(pageHits.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      primary: r.path,
      secondary: r.actorId ?? "anon",
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export interface AdminCounts {
  pilots: number;
  partners: number;
  /** Self-serve stalls waiting in the review queue. */
  partnersPending: number;
  activeOps: number;
  errors24h: number;
}

const ZERO_COUNTS: AdminCounts = {
  partnersPending: 0,
  pilots: 0,
  partners: 0,
  activeOps: 0,
  errors24h: 0,
};

export async function getCounts(): Promise<AdminCounts> {
  if (!useDb) return ZERO_COUNTS;
  try {
    const [u] = await db.select({ n: sql<number>`count(*)` }).from(users);
    const [pa] = await db
      .select({ n: sql<number>`count(*)` })
      .from(partners)
      .where(eq(partners.active, true));
    const [pp] = await db
      .select({ n: sql<number>`count(*)` })
      .from(partners)
      .where(eq(partners.status, "pending"));
    const [e] = await db
      .select({ n: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.status, "published"));
    const [er] = await db
      .select({ n: sql<number>`count(*)` })
      .from(errorLog)
      .where(sql`${errorLog.createdAt} > now() - interval '24 hours'`);
    return {
      pilots: Number(u?.n ?? 0),
      partners: Number(pa?.n ?? 0),
      partnersPending: Number(pp?.n ?? 0),
      activeOps: Number(e?.n ?? 0),
      errors24h: Number(er?.n ?? 0),
    };
  } catch {
    return ZERO_COUNTS;
  }
}
