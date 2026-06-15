import { db } from "@/lib/db";
import {
  posts,
  events,
  vendors,
  vendorGalleryItems,
  galleryItems,
  eventGalleryItems,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export interface PostView {
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  publishedAt: string;
}

export interface EventView {
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  status: "published" | "live" | "ended";
}

export interface VendorView {
  slug: string;
  businessName: string;
  tagline: string;
  bio: string;
  socials: { label: string; url: string }[];
  gallery: {
    title: string;
    caption: string;
    externalUrl?: string;
    imageUrl?: string;
  }[];
}

// Switches to live Postgres data the moment DATABASE_URL is set + seeded.
const useDb = !!process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Dev sample data (rendered until a database is connected)
// ---------------------------------------------------------------------------
export const samplePosts: PostView[] = [
  {
    slug: "the-doors-are-open",
    title: "The doors are open",
    excerpt:
      "Mythical Mecha is reborn. Here's what greets you at the threshold.",
    bodyMd:
      "We rebuilt the hall from the foundation stones up.\n\nOne hearth for the whole collective. Expect quests, scavenger trails, an Armory of artisans, and a leaderboard worth boasting about.\n\nPull up a chair — the tale is only beginning.",
    publishedAt: "2026-06-10",
  },
  {
    slug: "midsummer-revel-announced",
    title: "Midsummer Revel announced",
    excerpt: "Our grandest gathering yet, with a quest woven through it.",
    bodyMd:
      "Mark your calendars, adventurers.\n\nThe Midsummer Revel returns with tournaments, a costume parade, an artisans' market, and a town-wide scavenger quest with rune seals and riddles.\n\nRenown is on the line. Who claims the season?",
    publishedAt: "2026-06-04",
  },
  {
    slug: "armory-call-for-artisans",
    title: "Calling all artisans: join the Armory",
    excerpt: "The Armory opens its stalls to makers and merchants.",
    bodyMd:
      "The Armory is where our community's makers, artists and shops set out their wares.\n\nPetition from your character sheet, await word from the Keep, and your stall goes live with a gallery and links to your socials.",
    publishedAt: "2026-05-28",
  },
];

export const sampleEvents: EventView[] = [
  {
    slug: "opening-night-revel",
    title: "Opening Night Revel",
    summary: "An evening to christen the new hall. Ale, dice, and good company.",
    bodyMd:
      "We're throwing open the doors.\n\nMeet fellow adventurers, try the training-yard trials, and claim an opening-night badge. The first gathering of the season.",
    location: "The Hall, Woodstock",
    startsAt: "2026-06-14T18:00:00Z",
    endsAt: "2026-06-14T23:00:00Z",
    status: "live",
  },
  {
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
    slug: "otaku-mecha-marathon",
    title: "Otaku Night: Mecha Marathon",
    summary: "Back-to-back classic mecha anime. Cosplay encouraged.",
    bodyMd:
      "A night of giant robots.\n\nWe run a curated marathon of genre-defining mecha anime. Bring your cosplay; the finest costume earns renown.",
    location: "The Hall",
    startsAt: "2026-08-02T18:00:00Z",
    endsAt: "2026-08-02T23:30:00Z",
    status: "published",
  },
];

export const sampleVendors: VendorView[] = [
  {
    slug: "neon-forge-minis",
    businessName: "Neon Forge Minis",
    tagline: "Hand-painted miniatures & 3D-printed terrain",
    bio: "A two-person studio printing and painting tabletop minis and bespoke terrain for campaigns.",
    socials: [
      { label: "Instagram", url: "https://instagram.com" },
      { label: "Etsy", url: "https://etsy.com" },
    ],
    gallery: [
      { title: "Mech squad", caption: "32mm scale, NMM gold" },
      { title: "Ruined city board", caption: "Modular 2x2 terrain" },
    ],
  },
  {
    slug: "pixel-pantry",
    businessName: "Pixel Pantry",
    tagline: "Retro-arcade apparel & enamel pins",
    bio: "Streetwear and collectibles inspired by 8-bit and 16-bit classics.",
    socials: [{ label: "Shop", url: "https://example.com" }],
    gallery: [
      { title: "Glitch tee", caption: "Limited run" },
      { title: "Boss-key pin set", caption: "Hard enamel, 4-pack" },
    ],
  },
  {
    slug: "ronin-ink",
    businessName: "Ronin Ink",
    tagline: "Original manga-style prints & commissions",
    bio: "Illustrator taking commissions and selling giclée prints of original characters.",
    socials: [
      { label: "ArtStation", url: "https://artstation.com" },
      { label: "X", url: "https://x.com" },
    ],
    gallery: [
      { title: "Pilot portrait", caption: "A3 giclée" },
      { title: "Squadron poster", caption: "Limited print" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Query functions (DB when available, sample data otherwise)
// ---------------------------------------------------------------------------
export async function getPosts(): Promise<PostView[]> {
  if (!useDb) return samplePosts;
  try {
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt));
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt ?? "",
      bodyMd: r.bodyMd,
      publishedAt: (r.publishedAt ?? r.createdAt).toISOString().slice(0, 10),
    }));
  } catch {
    return samplePosts;
  }
}

export async function getPost(slug: string): Promise<PostView | null> {
  const all = await getPosts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getEvents(): Promise<EventView[]> {
  if (!useDb) return sampleEvents;
  try {
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.status, "published"))
      .orderBy(events.startsAt);
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? "",
      bodyMd: r.bodyMd ?? "",
      location: r.location,
      startsAt: (r.startsAt ?? r.createdAt).toISOString(),
      endsAt: (r.endsAt ?? r.createdAt).toISOString(),
      status: "published",
    }));
  } catch {
    return sampleEvents;
  }
}

export async function getEvent(slug: string): Promise<EventView | null> {
  const all = await getEvents();
  return all.find((e) => e.slug === slug) ?? null;
}

/**
 * The event to nudge an adventurer toward right now: within its window, or the
 * same day leading up to its start. Drives the live card + green dot.
 */
export async function getLiveEvent(): Promise<EventView | null> {
  const all = await getEvents();
  const now = Date.now();
  const LEAD_MS = 12 * 60 * 60 * 1000;
  return (
    all.find((e) => {
      const start = new Date(e.startsAt).getTime();
      const end = new Date(e.endsAt).getTime();
      return now >= start - LEAD_MS && now <= end;
    }) ?? null
  );
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

export async function getVendors(): Promise<VendorView[]> {
  if (!useDb) return sampleVendors;
  try {
    const vrows = await db
      .select()
      .from(vendors)
      .where(eq(vendors.active, true))
      .orderBy(vendors.businessName);
    const out: VendorView[] = [];
    for (const v of vrows) {
      const items = await db
        .select()
        .from(vendorGalleryItems)
        .where(eq(vendorGalleryItems.vendorId, v.id))
        .orderBy(vendorGalleryItems.sort);
      out.push({
        slug: v.slug,
        businessName: v.businessName,
        tagline: v.tagline ?? "",
        bio: v.bio ?? "",
        socials: (v.socials as { label: string; url: string }[]) ?? [],
        gallery: items.map((i) => ({
          title: i.title ?? "",
          caption: i.caption ?? "",
          externalUrl: i.externalUrl ?? undefined,
          imageUrl: i.imageUrl ?? undefined,
        })),
      });
    }
    return out;
  } catch {
    return sampleVendors;
  }
}

export async function getVendor(slug: string): Promise<VendorView | null> {
  const all = await getVendors();
  return all.find((v) => v.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Galleries — global (homepage) + per-event
// ---------------------------------------------------------------------------
export interface GalleryImage {
  imageUrl: string;
  caption: string | null;
}

const sampleGallery: GalleryImage[] = [
  { imageUrl: "/MythicMechaBackground.png", caption: "Tavern nights" },
  { imageUrl: "/MythicMechaBackground2.png", caption: "On the cliff" },
  { imageUrl: "/MythicMechaBackground3.png", caption: "Into the woods" },
  { imageUrl: "/MythicMechaAuthBackground.png", caption: "Under the aurora" },
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
    return rows.map((r) => ({ imageUrl: r.imageUrl, caption: r.caption }));
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
    return rows.map((r) => ({ imageUrl: r.imageUrl, caption: r.caption }));
  } catch {
    return [];
  }
}
