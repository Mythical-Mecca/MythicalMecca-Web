import { db } from "@/lib/db";
import {
  events,
  eventInterests,
  partners,
  partnerCategories,
  partnerGalleryItems,
  partnerOfferings,
  galleryItems,
  eventGalleryItems,
} from "@/lib/db/schema";
import { desc, eq, asc, and, inArray, sql } from "drizzle-orm";
import { toMediaSrc } from "@/lib/media";
import { parseSocials, type SocialLink } from "@/lib/socials";
import { formatPrice } from "@/lib/format";

export type EventOrigin = "hosted" | "partner" | "external" | "community";

/** Statuses visible to members. pending/rejected/draft never leave moderation. */
export const PUBLIC_EVENT_STATUSES = ["published", "live", "ended"] as const;

export interface EventView {
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  status: "published" | "live" | "ended";
  origin: EventOrigin;
  // origin=partner
  partnerSlug: string | null;
  partnerName: string | null;
  // origin=external
  sourceName: string | null;
  externalUrl: string | null;
  interestedCount: number;
}

export interface PartnerGalleryView {
  title: string;
  caption: string;
  kind: "art" | "product";
  externalUrl?: string;
  imageUrl?: string;
}

export interface PartnerOfferingView {
  id: string;
  kind: "product" | "service";
  name: string;
  description: string | null;
  /** Pre-formatted; null means "price on request". */
  price: string | null;
  imageUrl?: string;
  externalUrl?: string;
}

export interface PartnerView {
  id: string;
  slug: string;
  businessName: string;
  tagline: string;
  bio: string;
  isPremium: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  shopUrl?: string;
  offerings: PartnerOfferingView[];
  categorySlug: string | null;
  categoryName: string | null;
  // display toggles resolved from the partner's category
  showProducts: boolean;
  showArt: boolean;
  showReviews: boolean;
  showSocials: boolean;
  showGallery: boolean;
  socials: SocialLink[];
  gallery: PartnerGalleryView[];
}

// Switches to live Postgres data the moment DATABASE_URL is set + seeded.
const useDb = !!process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Dev sample data (rendered until a database is connected)
// ---------------------------------------------------------------------------
const eventDefaults = {
  origin: "hosted" as EventOrigin,
  partnerSlug: null,
  partnerName: null,
  sourceName: null,
  externalUrl: null,
  interestedCount: 0,
};

export const sampleEvents: EventView[] = [
  {
    ...eventDefaults,
    slug: "opening-night-revel",
    title: "Opening Night Revel",
    summary: "An evening to christen the new hall. Ale, dice, and good company.",
    bodyMd:
      "We're throwing open the doors.\n\nMeet fellow adventurers and try the training-yard trials. The first gathering of the season.",
    location: "The Hall, Woodstock",
    startsAt: "2026-06-14T18:00:00Z",
    endsAt: "2026-06-14T23:00:00Z",
    status: "live",
  },
  {
    ...eventDefaults,
    slug: "midsummer-revel-2026",
    title: "Midsummer Revel 2026",
    summary: "A full-day gathering: tournaments, costumes, artisans, and a quest.",
    bodyMd:
      "The grand gathering of the year.\n\nExpect open gaming tables, a tourney stage, a screening lounge, an artisans' market, and a town-wide scavenger quest. Hearty fare on site.",
    location: "Cape Town — The Hall, Woodstock",
    startsAt: "2026-07-18T09:00:00Z",
    endsAt: "2026-07-18T20:00:00Z",
    status: "published",
  },
  {
    ...eventDefaults,
    slug: "tabletop-tactics-night",
    title: "Tabletop Tactics Night",
    summary: "Bring a campaign, find a party. Minis painting corner open.",
    bodyMd:
      "A relaxed evening of TTRPGs and board games.\n\nNewcomers welcome — we'll get you to a table. Paint-and-take miniatures station running all night.",
    location: "Online + The Hall",
    startsAt: "2026-06-27T17:00:00Z",
    endsAt: "2026-06-27T22:00:00Z",
    status: "published",
  },
  {
    ...eventDefaults,
    slug: "otaku-mecha-marathon",
    title: "Otaku Night: Mecha Marathon",
    summary: "Back-to-back classic mecha anime. Cosplay encouraged.",
    bodyMd:
      "A night of giant robots.\n\nWe run a curated marathon of genre-defining mecha anime. Bring your cosplay; the finest costume wins the night.",
    location: "The Hall",
    startsAt: "2026-08-02T18:00:00Z",
    endsAt: "2026-08-02T23:30:00Z",
    status: "published",
  },
];

const partnerDefaults = {
  showProducts: true,
  showArt: true,
  showReviews: true,
  showSocials: true,
  showGallery: true,
  offerings: [] as PartnerOfferingView[],
};

export const samplePartners: PartnerView[] = [
  {
    id: "sample-neon-forge",
    slug: "neon-forge-minis",
    businessName: "Neon Forge Minis",
    tagline: "Hand-painted miniatures & 3D-printed terrain",
    bio: "A two-person studio printing and painting tabletop minis and bespoke terrain for campaigns.",
    isPremium: true,
    categorySlug: "vendors",
    categoryName: "Vendors",
    ...partnerDefaults,
    shopUrl: "https://example.com",
    offerings: [
      {
        id: "sample-offer-squad",
        kind: "service" as const,
        name: "Squad commission",
        description: "Five miniatures, tabletop-plus standard.",
        price: formatPrice(450000, "ZAR"),
      },
      {
        id: "sample-offer-terrain",
        kind: "product" as const,
        name: "Modular terrain tile",
        description: "2x2 ruined city board section.",
        price: formatPrice(89900, "ZAR"),
      },
    ],
    socials: parseSocials([
      { label: "Instagram", url: "https://instagram.com" },
      { label: "Etsy", url: "https://etsy.com" },
    ]),
    gallery: [
      { title: "Mech squad", caption: "32mm scale, NMM gold", kind: "art" },
      { title: "Ruined city board", caption: "Modular 2x2 terrain", kind: "product" },
    ],
  },
  {
    id: "sample-pixel-pantry",
    slug: "pixel-pantry",
    businessName: "Pixel Pantry",
    tagline: "Retro-arcade apparel & enamel pins",
    bio: "Streetwear and collectibles inspired by 8-bit and 16-bit classics.",
    isPremium: false,
    categorySlug: "vendors",
    categoryName: "Vendors",
    ...partnerDefaults,
    socials: parseSocials([{ label: "Shop", url: "https://example.com" }]),
    gallery: [
      { title: "Glitch tee", caption: "Limited run", kind: "product" },
      { title: "Boss-key pin set", caption: "Hard enamel, 4-pack", kind: "product" },
    ],
  },
  {
    id: "sample-ronin-ink",
    slug: "ronin-ink",
    businessName: "Ronin Ink",
    tagline: "Original manga-style prints & commissions",
    bio: "Illustrator taking commissions and selling giclée prints of original characters.",
    isPremium: false,
    categorySlug: "artists",
    categoryName: "Artists",
    ...partnerDefaults,
    showProducts: false,
    socials: parseSocials([
      { label: "ArtStation", url: "https://artstation.com" },
      { label: "X", url: "https://x.com" },
    ]),
    gallery: [
      { title: "Pilot portrait", caption: "A3 giclée", kind: "art" },
      { title: "Squadron poster", caption: "Limited print", kind: "art" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Query functions (DB when available, sample data otherwise)
// ---------------------------------------------------------------------------
const interestedCountSql = sql<number>`(
  select count(*)::int from ${eventInterests}
  where ${eventInterests.eventId} = ${events.id}
)`;

type EventRow = {
  e: typeof events.$inferSelect;
  partnerSlug: string | null;
  partnerName: string | null;
  interestedCount: number;
};

function toEventView(r: EventRow): EventView {
  const status = (
    PUBLIC_EVENT_STATUSES as readonly string[]
  ).includes(r.e.status)
    ? (r.e.status as EventView["status"])
    : "published";
  return {
    slug: r.e.slug,
    title: r.e.title,
    summary: r.e.summary ?? "",
    bodyMd: r.e.bodyMd ?? "",
    location: r.e.location,
    startsAt: (r.e.startsAt ?? r.e.createdAt).toISOString(),
    endsAt: (r.e.endsAt ?? r.e.createdAt).toISOString(),
    status,
    origin: r.e.origin,
    partnerSlug: r.partnerSlug,
    partnerName: r.partnerName,
    sourceName: r.e.sourceName,
    externalUrl: r.e.externalUrl,
    interestedCount: r.interestedCount,
  };
}

export async function getEvents(): Promise<EventView[]> {
  if (!useDb) return sampleEvents;
  try {
    const rows = await db
      .select({
        e: events,
        partnerSlug: partners.slug,
        partnerName: partners.businessName,
        interestedCount: interestedCountSql,
      })
      .from(events)
      .leftJoin(partners, eq(events.partnerId, partners.id))
      .where(inArray(events.status, [...PUBLIC_EVENT_STATUSES]))
      .orderBy(events.startsAt);
    return rows.map(toEventView);
  } catch {
    return sampleEvents;
  }
}

export async function getEvent(slug: string): Promise<EventView | null> {
  const all = await getEvents();
  return all.find((e) => e.slug === slug) ?? null;
}

/** Events whose window hasn't closed yet (impure now() stays out of render). */
export async function getUpcomingEvents(): Promise<EventView[]> {
  const all = await getEvents();
  const now = Date.now();
  return all.filter((e) => new Date(e.endsAt).getTime() >= now);
}

/**
 * Upcoming public events hosted by a partner — powers the partner-page
 * events section.
 */
export async function getEventsByPartner(
  partnerId: string
): Promise<EventView[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        e: events,
        partnerSlug: partners.slug,
        partnerName: partners.businessName,
        interestedCount: interestedCountSql,
      })
      .from(events)
      .leftJoin(partners, eq(events.partnerId, partners.id))
      .where(
        and(
          eq(events.partnerId, partnerId),
          inArray(events.status, [...PUBLIC_EVENT_STATUSES])
        )
      )
      .orderBy(events.startsAt);
    const now = Date.now();
    return rows
      .map(toEventView)
      .filter((e) => new Date(e.endsAt).getTime() >= now);
  } catch {
    return [];
  }
}

export async function hasMarkedInterested(
  slug: string,
  userId: string
): Promise<boolean> {
  if (!useDb) return false;
  try {
    const [row] = await db
      .select({ id: eventInterests.id })
      .from(eventInterests)
      .innerJoin(events, eq(eventInterests.eventId, events.id))
      .where(and(eq(events.slug, slug), eq(eventInterests.userId, userId)))
      .limit(1);
    return !!row;
  } catch {
    return false;
  }
}

const LIVE_LEAD_MS = 12 * 60 * 60 * 1000;

/** Within its window, or in the lead-up hours before the start. */
function inLiveWindow(e: EventView, now: number): boolean {
  const start = new Date(e.startsAt).getTime();
  return now >= start - LIVE_LEAD_MS && now <= new Date(e.endsAt).getTime();
}

/**
 * The event to nudge an adventurer toward right now: within its window, or the
 * same day leading up to its start. Drives the live card + green dot.
 */
export async function getLiveEvent(): Promise<EventView | null> {
  const all = await getEvents();
  const now = Date.now();
  return all.find((e) => inLiveWindow(e, now)) ?? null;
}

/**
 * One-query digest for dashboards: the live event plus the next `limit`
 * upcoming events (excluding the live one). Impure now() stays out of render.
 */
export async function getEventsDigest(limit = 3): Promise<{
  live: EventView | null;
  upcoming: EventView[];
}> {
  const all = await getEvents();
  const now = Date.now();
  const live = all.find((e) => inLiveWindow(e, now)) ?? null;
  const upcoming = all
    .filter(
      (e) =>
        e.slug !== live?.slug && new Date(e.endsAt).getTime() >= now
    )
    .slice(0, limit);
  return { live, upcoming };
}

/**
 * Everything an events *page* needs from one query: the whole published history
 * for the calendar (you can page back through past moons), plus the live event
 * and the still-to-come list derived off it. Impure now() stays out of render.
 */
export async function getEventsPage(): Promise<{
  all: EventView[];
  live: EventView | null;
  upcoming: EventView[];
}> {
  const all = await getEvents();
  const now = Date.now();
  const live = all.find((e) => inLiveWindow(e, now)) ?? null;
  const upcoming = all.filter(
    (e) => e.slug !== live?.slug && new Date(e.endsAt).getTime() >= now
  );
  return { all, live, upcoming };
}

export function isEventStarted(e: EventView): boolean {
  return Date.now() >= new Date(e.startsAt).getTime();
}

export function isEventLive(e: EventView): boolean {
  const now = Date.now();
  return (
    now >= new Date(e.startsAt).getTime() &&
    now <= new Date(e.endsAt).getTime()
  );
}

/** True once the event's end time has passed. */
export function isEventEnded(e: EventView): boolean {
  return Date.now() > new Date(e.endsAt).getTime();
}

/**
 * Only approved-and-active partners are public. `status` is the review
 * lifecycle and `active` is the admin kill switch — both must pass, and
 * approved+inactive is a deliberate, valid state.
 */
const publicPartner = and(
  eq(partners.active, true),
  eq(partners.status, "approved")
);

function groupByPartner<T extends { partnerId: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const list = out.get(r.partnerId);
    if (list) list.push(r);
    else out.set(r.partnerId, [r]);
  }
  return out;
}

/**
 * Row → public view. The display toggles come from the partner's category and
 * default to "shown" when a partner has no category yet.
 */
function toPartnerView(
  p: typeof partners.$inferSelect,
  c: typeof partnerCategories.$inferSelect | null,
  items: (typeof partnerGalleryItems.$inferSelect)[],
  offerings: (typeof partnerOfferings.$inferSelect)[] = []
): PartnerView {
  return {
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    tagline: p.tagline ?? "",
    bio: p.bio ?? "",
    isPremium: p.isPremium,
    logoUrl: toMediaSrc(p.logoUrl) ?? undefined,
    bannerUrl: toMediaSrc(p.bannerUrl) ?? undefined,
    shopUrl: p.shopUrl ?? undefined,
    offerings: offerings.map((o) => ({
      id: o.id,
      kind: o.kind,
      name: o.name,
      description: o.description,
      price: formatPrice(o.priceCents, o.currency),
      imageUrl: toMediaSrc(o.imageUrl) ?? undefined,
      externalUrl: o.externalUrl ?? undefined,
    })),
    categorySlug: c?.slug ?? null,
    categoryName: c?.name ?? null,
    showProducts: c?.showProducts ?? true,
    showArt: c?.showArt ?? true,
    showReviews: c?.showReviews ?? true,
    showSocials: c?.showSocials ?? true,
    showGallery: c?.showGallery ?? true,
    socials: parseSocials(p.socials),
    gallery: items.map((i) => ({
      title: i.title ?? "",
      caption: i.caption ?? "",
      kind: i.kind,
      externalUrl: i.externalUrl ?? undefined,
      imageUrl: toMediaSrc(i.imageUrl) ?? undefined,
    })),
  };
}

export async function getPartners(): Promise<PartnerView[]> {
  if (!useDb) return samplePartners;
  try {
    // Premium partners surface first, then alphabetical.
    const prows = await db
      .select({ p: partners, c: partnerCategories })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .where(publicPartner)
      .orderBy(desc(partners.isPremium), asc(partners.businessName));
    if (prows.length === 0) return [];

    // Two batched queries, not one pair per partner.
    const ids = prows.map((r) => r.p.id);
    const [items, offers] = await Promise.all([
      db
        .select()
        .from(partnerGalleryItems)
        .where(inArray(partnerGalleryItems.partnerId, ids))
        .orderBy(asc(partnerGalleryItems.sort)),
      db
        .select()
        .from(partnerOfferings)
        .where(
          and(
            inArray(partnerOfferings.partnerId, ids),
            eq(partnerOfferings.active, true)
          )
        )
        .orderBy(asc(partnerOfferings.sort)),
    ]);
    const galleryBy = groupByPartner(items);
    const offersBy = groupByPartner(offers);

    return prows.map(({ p, c }) =>
      toPartnerView(p, c, galleryBy.get(p.id) ?? [], offersBy.get(p.id) ?? [])
    );
  } catch {
    return samplePartners;
  }
}

export interface PartnerCategoryGroup {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort: number;
  partners: PartnerView[];
}

/**
 * Public partners grouped under their category, ordered by the admin-controlled
 * `sort`. Three queries regardless of how many partners there are.
 *
 * `featuredOnly` honours `partner_categories.featured_on_home` — the flag the
 * admin screen has always written but nothing ever read. It also restricts the
 * result to categorised partners, which is what the homepage wants.
 *
 * The full listing uses a LEFT join instead, so a partner with no category (the
 * admin create form allows it) still appears, under a trailing "Other" group,
 * rather than silently vanishing from the public directory.
 */
export async function getPartnersByCategory(opts?: {
  featuredOnly?: boolean;
}): Promise<PartnerCategoryGroup[]> {
  const all = useDb ? null : samplePartners;
  // No-DB fallback: synthesise groups from the sample data.
  if (all) return groupSamplePartners(all);

  const featuredOnly = opts?.featuredOnly ?? false;
  try {
    const base = db
      .select({ p: partners, c: partnerCategories })
      .from(partners);
    const rows = await (featuredOnly
      ? base.innerJoin(
          partnerCategories,
          eq(partners.categoryId, partnerCategories.id)
        )
      : base.leftJoin(
          partnerCategories,
          eq(partners.categoryId, partnerCategories.id)
        )
    )
      .where(
        featuredOnly
          ? and(publicPartner, eq(partnerCategories.featuredOnHome, true))
          : publicPartner
      )
      .orderBy(
        // NULLS LAST keeps uncategorised partners in the trailing group.
        sql`${partnerCategories.sort} asc nulls last`,
        asc(partnerCategories.name),
        desc(partners.isPremium),
        asc(partners.businessName)
      );
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.p.id);
    const [items, offers] = await Promise.all([
      db
        .select()
        .from(partnerGalleryItems)
        .where(inArray(partnerGalleryItems.partnerId, ids))
        .orderBy(asc(partnerGalleryItems.sort)),
      db
        .select()
        .from(partnerOfferings)
        .where(
          and(
            inArray(partnerOfferings.partnerId, ids),
            eq(partnerOfferings.active, true)
          )
        )
        .orderBy(asc(partnerOfferings.sort)),
    ]);
    const galleryBy = groupByPartner(items);
    const offersBy = groupByPartner(offers);

    // Insertion order follows the ORDER BY, so groups come out sorted.
    const groups = new Map<string, PartnerCategoryGroup>();
    for (const { p, c } of rows) {
      const key = c?.id ?? "__uncategorised__";
      let g = groups.get(key);
      if (!g) {
        g = c
          ? {
              slug: c.slug,
              name: c.name,
              description: c.description,
              icon: c.icon,
              color: c.color,
              sort: c.sort,
              partners: [],
            }
          : {
              slug: "other",
              name: "Other",
              description: null,
              icon: null,
              color: null,
              sort: Number.MAX_SAFE_INTEGER,
              partners: [],
            };
        groups.set(key, g);
      }
      g.partners.push(
        toPartnerView(p, c, galleryBy.get(p.id) ?? [], offersBy.get(p.id) ?? [])
      );
    }
    return [...groups.values()];
  } catch {
    return groupSamplePartners(samplePartners);
  }
}

/**
 * Mirrors the grouping above for the no-database path. `featuredOnly` is not
 * modelled here — the sample categories carry no featured flag, so the fallback
 * always shows everything rather than silently rendering an empty homepage.
 */
function groupSamplePartners(list: PartnerView[]): PartnerCategoryGroup[] {
  const groups = new Map<string, PartnerCategoryGroup>();
  for (const p of list) {
    if (!p.categorySlug || !p.categoryName) continue;
    let g = groups.get(p.categorySlug);
    if (!g) {
      g = {
        slug: p.categorySlug,
        name: p.categoryName,
        description: null,
        icon: null,
        color: null,
        sort: 0,
        partners: [],
      };
      groups.set(p.categorySlug, g);
    }
    g.partners.push(p);
  }
  return [...groups.values()];
}

/**
 * One partner by slug — a single indexed lookup plus one gallery query, rather
 * than loading every partner and filtering in JS.
 *
 * `includeUnpublished` bypasses the status/active filter so an owner can preview
 * a draft before submitting it. Callers MUST prove access first (see
 * getMembership in lib/partner-access.ts) — this flag is not an authorization
 * check, only a query switch.
 */
export async function getPartner(
  slug: string,
  opts?: { includeUnpublished?: boolean }
): Promise<PartnerView | null> {
  if (!useDb) return samplePartners.find((p) => p.slug === slug) ?? null;
  try {
    const [row] = await db
      .select({ p: partners, c: partnerCategories })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .where(
        opts?.includeUnpublished
          ? eq(partners.slug, slug)
          : and(eq(partners.slug, slug), publicPartner)
      )
      .limit(1);
    if (!row) return null;

    const [items, offers] = await Promise.all([
      db
        .select()
        .from(partnerGalleryItems)
        .where(eq(partnerGalleryItems.partnerId, row.p.id))
        .orderBy(asc(partnerGalleryItems.sort)),
      db
        .select()
        .from(partnerOfferings)
        .where(
          and(
            eq(partnerOfferings.partnerId, row.p.id),
            eq(partnerOfferings.active, true)
          )
        )
        .orderBy(asc(partnerOfferings.sort)),
    ]);
    return toPartnerView(row.p, row.c, items, offers);
  } catch {
    return samplePartners.find((p) => p.slug === slug) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Galleries — global (homepage) + per-event
// ---------------------------------------------------------------------------
export interface GalleryImage {
  imageUrl: string;
  caption: string | null;
}

const sampleGallery: GalleryImage[] = [
  { imageUrl: "/MythicMechaBackground.webp", caption: "Tavern nights" },
  { imageUrl: "/MythicMechaBackground2.webp", caption: "On the cliff" },
  { imageUrl: "/MythicMechaBackground3.webp", caption: "Into the woods" },
  { imageUrl: "/MythicMechaAuthBackground.webp", caption: "Under the aurora" },
];

export async function getGalleryImages(): Promise<GalleryImage[]> {
  if (!useDb) return sampleGallery;
  try {
    const rows = await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.published, true))
      .orderBy(galleryItems.sort, desc(galleryItems.createdAt));
    if (rows.length === 0) return sampleGallery;
    return rows.map((r) => ({ imageUrl: toMediaSrc(r.imageUrl), caption: r.caption }));
  } catch {
    return sampleGallery;
  }
}

export async function getEventGallery(slug: string): Promise<GalleryImage[]> {
  if (!useDb) return [];
  try {
    const [e] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);
    if (!e) return [];
    const rows = await db
      .select()
      .from(eventGalleryItems)
      .where(eq(eventGalleryItems.eventId, e.id))
      .orderBy(eventGalleryItems.sort);
    return rows.map((r) => ({ imageUrl: toMediaSrc(r.imageUrl), caption: r.caption }));
  } catch {
    return [];
  }
}
