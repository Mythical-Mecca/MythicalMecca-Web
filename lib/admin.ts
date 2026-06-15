import "server-only";
import { db } from "@/lib/db";
import {
  posts,
  events,
  vendorApplications,
  activityLog,
  errorLog,
  pageHits,
  users,
} from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { sampleEvents } from "@/lib/content";

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

export interface AdminPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
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

export async function listPosts(): Promise<AdminPost[]> {
  if (!useDb) return [];
  try {
    const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
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

export async function listApplications(): Promise<AdminApplication[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(vendorApplications)
      .orderBy(desc(vendorApplications.createdAt));
    return rows.map((r) => ({
      id: r.id,
      businessName: r.businessName,
      pitch: r.pitch,
      images: (r.images as string[] | null) ?? [],
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
  posts: number;
  activeOps: number;
  errors24h: number;
}

export async function getCounts(): Promise<AdminCounts> {
  if (!useDb) return { pilots: 0, posts: 0, activeOps: 0, errors24h: 0 };
  try {
    const [u] = await db.select({ n: sql<number>`count(*)` }).from(users);
    const [p] = await db.select({ n: sql<number>`count(*)` }).from(posts);
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
      posts: Number(p?.n ?? 0),
      activeOps: Number(e?.n ?? 0),
      errors24h: Number(er?.n ?? 0),
    };
  } catch {
    return { pilots: 0, posts: 0, activeOps: 0, errors24h: 0 };
  }
}
