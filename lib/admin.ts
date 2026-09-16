import "server-only";
import { db } from "@/lib/db";
import {
  events,
  partners,
  partnerCategories,
  partnerApplications,
  activityLog,
  errorLog,
  pageHits,
  users,
  galleryItems,
  scavengerHunts,
  eventGalleryItems,
  eventComments,
  eventReviews,
  eventInterests,
  chatMessages,
  playerSignups,
} from "@/lib/db/schema";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { sampleEvents } from "@/lib/content";
import { toMediaSrc } from "@/lib/media";
import { signupWebhookUrl } from "@/lib/signup";

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
  /** Null while the event isn't public — see events.slug. */
  slug: string | null;
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
  /** Who applied — the account the stall would be handed to. */
  applicantName: string | null;
  applicantEmail: string | null;
  categoryName: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
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

/**
 * Every editable column of every event, for the admin table.
 *
 * Kept separate from `listEvents`, which is the lightweight shape the quest
 * builder uses as an event picker and has no business growing twenty fields.
 */
export interface AdminEventRow {
  id: string;
  title: string;
  /** Null while the event isn't public — see events.slug in the schema. */
  slug: string | null;
  status: string;
  origin: string;
  summary: string | null;
  bodyMd: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  /** True when the event collects nothing — see events.noDataMode. */
  noDataMode: boolean;
  partnerId: string | null;
  partnerName: string | null;
  sourceName: string | null;
  externalUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Quests attached to this event — usually none or one. */
  quests: { slug: string; title: string }[];
  /** See events.signupUrl. */
  signupUrl: string | null;
  signupLabel: string | null;
  signupBlurb: string | null;
  /**
   * Where the external form should POST. Null until a sign-up URL has been
   * saved once, which is when the secret is minted.
   */
  signupWebhookUrl: string | null;
}

export async function listEventRows(): Promise<AdminEventRow[]> {
  if (!useDb) {
    return sampleAdminEvents().map((e) => ({
      ...e,
      origin: "hosted",
      summary: null,
      bodyMd: null,
      lat: null,
      lng: null,
      capacity: null,
      noDataMode: false,
      partnerId: null,
      partnerName: null,
      sourceName: null,
      externalUrl: null,
      reviewNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quests: [],
      signupUrl: null,
      signupLabel: null,
      signupBlurb: null,
      signupWebhookUrl: null,
    }));
  }
  try {
    const [rows, quests] = await Promise.all([
      db
        .select({ e: events, partnerName: partners.businessName })
        .from(events)
        .leftJoin(partners, eq(events.partnerId, partners.id))
        .orderBy(desc(events.createdAt)),
      // One query for every event's quests, rather than a join that would
      // duplicate an event row per quest.
      db
        .select({
          eventId: scavengerHunts.eventId,
          slug: scavengerHunts.slug,
          title: scavengerHunts.title,
        })
        .from(scavengerHunts)
        .orderBy(scavengerHunts.createdAt),
    ]);

    const questsByEvent = new Map<string, { slug: string; title: string }[]>();
    for (const q of quests) {
      if (!q.eventId) continue;
      const list = questsByEvent.get(q.eventId) ?? [];
      list.push({ slug: q.slug, title: q.title });
      questsByEvent.set(q.eventId, list);
    }

    return rows.map(({ e, partnerName }) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      status: e.status,
      origin: e.origin,
      summary: e.summary,
      bodyMd: e.bodyMd,
      location: e.location,
      lat: e.lat,
      lng: e.lng,
      startsAt: e.startsAt ? e.startsAt.toISOString() : null,
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      capacity: e.capacity,
      noDataMode: e.noDataMode,
      partnerId: e.partnerId,
      partnerName,
      sourceName: e.sourceName,
      externalUrl: e.externalUrl,
      reviewNote: e.reviewNote,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      quests: questsByEvent.get(e.id) ?? [],
      signupUrl: e.signupUrl,
      signupLabel: e.signupLabel,
      signupBlurb: e.signupBlurb,
      signupWebhookUrl: e.signupWebhookSecret
        ? signupWebhookUrl(e.signupWebhookSecret)
        : null,
    }));
  } catch {
    return [];
  }
}

export interface CommunityEventSubmission {
  id: string;
  title: string;
  /** Null while the event isn't public — see events.slug. */
  slug: string | null;
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
  published: boolean;
  sort: number;
  /** Every open of the photo in the public viewer. */
  views: number;
  /** Distinct viewers — see lib/gallery.ts for what counts as one. */
  uniqueViews: number;
  createdAt: string;
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
      published: r.published,
      sort: r.sort,
      views: r.views,
      uniqueViews: r.uniqueViews,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function listApplications(): Promise<AdminApplication[]> {
  if (!useDb) return [];
  try {
    const applicant = alias(users, "applicant");
    const reviewer = alias(users, "reviewer");
    const rows = await db
      .select({
        a: partnerApplications,
        applicantName: applicant.name,
        applicantEmail: applicant.email,
        reviewerName: reviewer.name,
        categoryName: partnerCategories.name,
      })
      .from(partnerApplications)
      .leftJoin(applicant, eq(partnerApplications.userId, applicant.id))
      .leftJoin(reviewer, eq(partnerApplications.reviewedBy, reviewer.id))
      .leftJoin(
        partnerCategories,
        eq(partnerApplications.categoryId, partnerCategories.id)
      )
      .where(ne(partnerApplications.status, "draft"))
      .orderBy(desc(partnerApplications.createdAt));
    return rows.map(({ a: r, ...j }) => ({
      id: r.id,
      businessName: r.businessName,
      pitch: r.pitch,
      images: ((r.images as string[] | null) ?? []).map((u) => toMediaSrc(u)),
      socials: (r.socials as Record<string, string> | null) ?? {},
      status: r.status,
      userId: r.userId,
      applicantName: j.applicantName,
      applicantEmail: j.applicantEmail,
      categoryName: j.categoryName,
      reviewerName: j.reviewerName,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt.toISOString().slice(0, 10),
      updatedAt: r.updatedAt.toISOString().slice(0, 10),
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

// ---------------------------------------------------------------------------
// One event, everything about it — the per-event management page
// ---------------------------------------------------------------------------

export interface AdminGalleryImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  sort: number;
}

export interface AdminEventPerson {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  deleted: boolean;
}

export interface AdminEventReview {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  createdAt: string;
}

export interface AdminEventDetail extends AdminEventRow {
  /** Webhook sign-ups that have landed for this event, matched or not. */
  signupsReceived: number;
  submitterName: string | null;
  reviewerName: string | null;
  gallery: AdminGalleryImage[];
  interested: number;
  comments: AdminEventPerson[];
  chat: AdminEventPerson[];
  reviews: AdminEventReview[];
  /** Mean rating, or null when nobody has reviewed yet. */
  ratingAvg: number | null;
}

/**
 * Everything the management page shows, in one pass.
 *
 * Deliberately eager: the page renders all of it behind tabs, and eight small
 * indexed lookups on one event cost less than the round trips of fetching them
 * tab by tab.
 */
export async function getEventAdmin(
  id: string
): Promise<AdminEventDetail | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({ e: events, partnerName: partners.businessName })
      .from(events)
      .leftJoin(partners, eq(events.partnerId, partners.id))
      .where(eq(events.id, id))
      .limit(1);
    if (!row) return null;
    const e = row.e;

    const submitter = alias(users, "submitter");
    const reviewer = alias(users, "reviewer");

    const [
      people,
      gallery,
      quests,
      interestRows,
      commentRows,
      chatRows,
      reviewRows,
      signupRows,
    ] = await Promise.all([
      db
        .select({
          submitterName: submitter.name,
          reviewerName: reviewer.name,
        })
        .from(events)
        .leftJoin(submitter, eq(events.createdBy, submitter.id))
        .leftJoin(reviewer, eq(events.reviewedBy, reviewer.id))
        .where(eq(events.id, id))
        .limit(1),
      db
        .select()
        .from(eventGalleryItems)
        .where(eq(eventGalleryItems.eventId, id))
        .orderBy(eventGalleryItems.sort, eventGalleryItems.createdAt),
      db
        .select({ slug: scavengerHunts.slug, title: scavengerHunts.title })
        .from(scavengerHunts)
        .where(eq(scavengerHunts.eventId, id))
        .orderBy(scavengerHunts.createdAt),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(eventInterests)
        .where(eq(eventInterests.eventId, id)),
      db
        .select({ c: eventComments, authorName: users.name })
        .from(eventComments)
        .leftJoin(users, eq(eventComments.userId, users.id))
        .where(eq(eventComments.eventId, id))
        .orderBy(desc(eventComments.createdAt)),
      db
        .select({ m: chatMessages, authorName: users.name })
        .from(chatMessages)
        .leftJoin(users, eq(chatMessages.userId, users.id))
        .where(
          and(eq(chatMessages.scopeType, "event"), eq(chatMessages.scopeId, id))
        )
        .orderBy(desc(chatMessages.createdAt)),
      db
        .select({ r: eventReviews, authorName: users.name })
        .from(eventReviews)
        .leftJoin(users, eq(eventReviews.userId, users.id))
        .where(eq(eventReviews.eventId, id))
        .orderBy(desc(eventReviews.createdAt)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(playerSignups)
        .where(eq(playerSignups.eventId, id)),
    ]);

    const ratings = reviewRows.map((x) => x.r.rating);
    const unknown = "Unknown adventurer";

    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      status: e.status,
      origin: e.origin,
      summary: e.summary,
      bodyMd: e.bodyMd,
      location: e.location,
      lat: e.lat,
      lng: e.lng,
      startsAt: e.startsAt ? e.startsAt.toISOString() : null,
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      capacity: e.capacity,
      noDataMode: e.noDataMode,
      partnerId: e.partnerId,
      partnerName: row.partnerName,
      sourceName: e.sourceName,
      externalUrl: e.externalUrl,
      reviewNote: e.reviewNote,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      quests,
      signupUrl: e.signupUrl,
      signupLabel: e.signupLabel,
      signupBlurb: e.signupBlurb,
      signupWebhookUrl: e.signupWebhookSecret
        ? signupWebhookUrl(e.signupWebhookSecret)
        : null,
      signupsReceived: signupRows[0]?.n ?? 0,
      submitterName: people[0]?.submitterName ?? null,
      reviewerName: people[0]?.reviewerName ?? null,
      gallery: gallery.map((g) => ({
        id: g.id,
        imageUrl: toMediaSrc(g.imageUrl),
        caption: g.caption,
        sort: g.sort,
      })),
      interested: interestRows[0]?.n ?? 0,
      comments: commentRows.map(({ c, authorName }) => ({
        id: c.id,
        authorName: authorName ?? unknown,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        deleted: c.deletedAt !== null,
      })),
      chat: chatRows.map(({ m, authorName }) => ({
        id: m.id,
        authorName: authorName ?? unknown,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        deleted: m.deletedAt !== null,
      })),
      reviews: reviewRows.map(({ r, authorName }) => ({
        id: r.id,
        authorName: authorName ?? unknown,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      })),
      ratingAvg: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null,
    };
  } catch {
    return null;
  }
}
