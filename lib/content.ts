import { db } from "@/lib/db";
import { posts, events, vendors, vendorGalleryItems } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export type Division = "tabletop" | "arcade" | "otaku" | "maker";

export const DIVISION_LABEL: Record<Division, string> = {
  tabletop: "Tabletop",
  arcade: "Arcade",
  otaku: "Otaku",
  maker: "Maker",
};

export interface PostView {
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  division: Division | null;
  publishedAt: string;
}

export interface EventView {
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  division: Division | null;
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
  division: Division | null;
  socials: { label: string; url: string }[];
  gallery: { title: string; caption: string; externalUrl?: string }[];
}

// Switches to live Postgres data the moment DATABASE_URL is set + seeded.
const useDb = !!process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Dev sample data (rendered until a database is connected)
// ---------------------------------------------------------------------------
export const samplePosts: PostView[] = [
  {
    slug: "hangar-doors-open",
    title: "The hangar doors are open",
    excerpt:
      "Mythic Mecha 2.0 is live. Here's what's loading into the cockpit first.",
    bodyMd:
      "We rebuilt the homebase from the rivets up.\n\nFour divisions, one hangar: Tabletop, Arcade, Otaku and Maker. Expect ops, scavenger hunts, an Armory of vendors, and a leaderboard worth bragging about.\n\nSuit up — this is only the boot sequence.",
    division: "maker",
    publishedAt: "2026-06-10",
  },
  {
    slug: "summer-sortie-announced",
    title: "Summer Sortie 2026 announced",
    excerpt: "Our biggest in-person op yet, with a live scavenger hunt.",
    bodyMd:
      "Mark your calendars, Pilots.\n\nThe Summer Sortie returns with tournaments, a cosplay runway, a maker bay, and a city-wide scavenger hunt with QR uplinks and riddles.\n\nSquadron points are on the line. Which division takes the season?",
    division: "arcade",
    publishedAt: "2026-06-04",
  },
  {
    slug: "armory-call-for-vendors",
    title: "Calling all makers: join the Armory",
    excerpt: "Applications are open for vendors to showcase their gear.",
    bodyMd:
      "The Armory is where our community's makers, artists and shops show off.\n\nApply from your pilot loadout, get reviewed by Command, and your manufacturer page goes live with a gallery and social uplinks.",
    division: "tabletop",
    publishedAt: "2026-05-28",
  },
];

export const sampleEvents: EventView[] = [
  {
    slug: "pilot-mixer-launch-night",
    title: "Pilot Mixer — Launch Night",
    summary: "An evening to christen the new hangar. Drinks, demos, dice.",
    bodyMd:
      "We're opening the hangar doors.\n\nMeet fellow pilots across all four divisions, try the arcade sims, and grab a launch-night badge. First sortie of the season.",
    division: "maker",
    location: "The Hangar, Woodstock",
    startsAt: "2026-06-14T18:00:00Z",
    endsAt: "2026-06-14T23:00:00Z",
    status: "live",
  },
  {
    slug: "summer-sortie-2026",
    title: "Summer Sortie 2026",
    summary: "A full-day in-person op: tournaments, cosplay, makers, and a hunt.",
    bodyMd:
      "The flagship gathering of the year.\n\nExpect open gaming tables, an esports stage, an anime screening lounge, a maker bay, and a city-wide scavenger hunt. Food trucks on site.",
    division: "arcade",
    location: "Cape Town — The Hangar, Woodstock",
    startsAt: "2026-07-18T09:00:00Z",
    endsAt: "2026-07-18T20:00:00Z",
    status: "published",
  },
  {
    slug: "tabletop-tactics-night",
    title: "Tabletop Tactics Night",
    summary: "Bring a campaign, find a party. Minis painting corner open.",
    bodyMd:
      "A relaxed evening of TTRPGs and board games.\n\nNew pilots welcome — we'll get you to a table. Paint-and-take miniatures station running all night.",
    division: "tabletop",
    location: "Online + The Hangar",
    startsAt: "2026-06-27T17:00:00Z",
    endsAt: "2026-06-27T22:00:00Z",
    status: "published",
  },
  {
    slug: "otaku-screening-mecha-marathon",
    title: "Otaku Screening: Mecha Marathon",
    summary: "Back-to-back classic mecha. Cosplay encouraged.",
    bodyMd:
      "A night of giant robots.\n\nWe run a curated marathon of genre-defining mecha. Bring your cosplay; best loadout wins XP.",
    division: "otaku",
    location: "The Hangar",
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
    division: "tabletop",
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
    division: "arcade",
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
    division: "otaku",
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
      division: (r.division as Division) ?? null,
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
      division: (r.division as Division) ?? null,
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
 * The event a Pilot should be nudged toward right now: within its window, or
 * the same day leading up to its start. Drives the sortie card + green dot.
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
        division: (v.division as Division) ?? null,
        socials: (v.socials as { label: string; url: string }[]) ?? [],
        gallery: items.map((i) => ({
          title: i.title ?? "",
          caption: i.caption ?? "",
          externalUrl: i.externalUrl ?? undefined,
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
