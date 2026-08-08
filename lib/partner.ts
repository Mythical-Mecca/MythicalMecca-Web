import "server-only";
import { db } from "@/lib/db";
import {
  partners,
  partnerCategories,
  partnerGalleryItems,
  partnerMembers,
  partnerOfferings,
} from "@/lib/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { toMediaSrc } from "@/lib/media";
import { parseSocials } from "@/lib/socials";
import type { PartnerStatus } from "@/lib/partner-access";

const useDb = !!process.env.DATABASE_URL;

export interface MyPartner {
  id: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  bio: string | null;
  isPremium: boolean;
  status: PartnerStatus;
  reviewNote: string | null;
  categoryId: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  shopUrl: string | null;
  /**
   * Stored socials flattened to the comma-separated string the current editor
   * uses. Derived via parseSocials so a partner whose row is already in the
   * keyed shape still sees their links (and doesn't blank them on save).
   */
  socialsText: string;
}

function toMyPartner(r: typeof partners.$inferSelect): MyPartner {
  return {
    id: r.id,
    slug: r.slug,
    businessName: r.businessName,
    tagline: r.tagline,
    bio: r.bio,
    isPremium: r.isPremium,
    status: r.status,
    reviewNote: r.reviewNote,
    categoryId: r.categoryId,
    logoUrl: toMediaSrc(r.logoUrl),
    bannerUrl: toMediaSrc(r.bannerUrl),
    shopUrl: r.shopUrl,
    socialsText: parseSocials(r.socials)
      .map((l) => l.url)
      .join(", "),
  };
}

/** One partner the user may manage, by id. Access is checked separately. */
export async function getPartnerForHub(
  partnerId: string
): Promise<MyPartner | null> {
  if (!useDb) return null;
  try {
    const [r] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);
    return r ? toMyPartner(r) : null;
  } catch {
    return null;
  }
}

export interface GalleryItem {
  id: string;
  kind: "art" | "product";
  imageUrl: string | null;
  title: string | null;
  caption: string | null;
  externalUrl: string | null;
}

/**
 * The user's default partner — owned pages first, then alphabetical.
 *
 * A user may now manage several, so this is only the landing default; the hub
 * picker (Phase 2) addresses each page by id. Resolved through partner_members,
 * not the legacy `partners.user_id`.
 */
export async function getMyPartner(userId: string): Promise<MyPartner | null> {
  if (!useDb || !userId) return null;
  try {
    const [row] = await db
      .select({ p: partners })
      .from(partnerMembers)
      .innerJoin(partners, eq(partnerMembers.partnerId, partners.id))
      .where(eq(partnerMembers.userId, userId))
      .orderBy(
        // Explicit rather than relying on the enum's declaration ordinal.
        sql`case when ${partnerMembers.role} = 'owner' then 0 else 1 end`,
        asc(partners.businessName)
      )
      .limit(1);
    return row ? toMyPartner(row.p) : null;
  } catch {
    return null;
  }
}

export async function listMyGallery(partnerId: string): Promise<GalleryItem[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(partnerGalleryItems)
      .where(eq(partnerGalleryItems.partnerId, partnerId))
      .orderBy(asc(partnerGalleryItems.sort));
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      imageUrl: toMediaSrc(r.imageUrl),
      title: r.title,
      caption: r.caption,
      externalUrl: r.externalUrl,
    }));
  } catch {
    return [];
  }
}

export interface OfferingItem {
  id: string;
  kind: "product" | "service";
  name: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  imageUrl: string | null;
  externalUrl: string | null;
  active: boolean;
  sort: number;
}

/** Everything a stall sells, including inactive rows (hub view). */
export async function listOfferings(
  partnerId: string
): Promise<OfferingItem[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(partnerOfferings)
      .where(eq(partnerOfferings.partnerId, partnerId))
      .orderBy(asc(partnerOfferings.sort), asc(partnerOfferings.name));
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      description: r.description,
      priceCents: r.priceCents,
      currency: r.currency,
      imageUrl: toMediaSrc(r.imageUrl),
      externalUrl: r.externalUrl,
      active: r.active,
      sort: r.sort,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Admin partner management
// ---------------------------------------------------------------------------
export interface AdminPartner {
  id: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  bio: string | null;
  isPremium: boolean;
  active: boolean;
  categoryId: string | null;
  categoryName: string | null;
  status: PartnerStatus;
  reviewNote: string | null;
  memberCount: number;
  socialsRaw: string | null;
  createdAt: string;
}

/** Correlated count — cheaper than a group-by for a list this size. */
const memberCountSql = sql<number>`(
  select count(*)::int from ${partnerMembers}
  where ${partnerMembers.partnerId} = ${partners.id}
)`;

function toAdminPartner(
  p: typeof partners.$inferSelect,
  categoryName: string | null,
  memberCount: number
): AdminPartner {
  const links = parseSocials(p.socials);
  return {
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    tagline: p.tagline,
    bio: p.bio,
    isPremium: p.isPremium,
    active: p.active,
    categoryId: p.categoryId,
    categoryName,
    status: p.status,
    reviewNote: p.reviewNote,
    memberCount,
    // Tolerant of every stored shape, so editing never silently drops links.
    socialsRaw: links.length ? links.map((l) => l.url).join("\n") : null,
    createdAt: p.createdAt.toISOString().slice(0, 10),
  };
}

/** All partners with their category — admin list. */
export async function listPartners(): Promise<AdminPartner[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ p: partners, c: partnerCategories, members: memberCountSql })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .orderBy(desc(partners.isPremium), asc(partners.businessName));
    return rows.map(({ p, c, members }) =>
      toAdminPartner(p, c?.name ?? null, members)
    );
  } catch {
    return [];
  }
}

/**
 * The review queue: stalls submitted by their owners, oldest submission first
 * so nobody waits behind a later arrival.
 */
export async function listPartnersForReview(): Promise<AdminPartner[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ p: partners, c: partnerCategories, members: memberCountSql })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .where(eq(partners.status, "pending"))
      .orderBy(asc(partners.submittedAt));
    return rows.map(({ p, c, members }) =>
      toAdminPartner(p, c?.name ?? null, members)
    );
  } catch {
    return [];
  }
}

export async function getPartnerById(id: string): Promise<AdminPartner | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({ p: partners, c: partnerCategories, members: memberCountSql })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .where(eq(partners.id, id))
      .limit(1);
    if (!row) return null;
    return toAdminPartner(row.p, row.c?.name ?? null, row.members);
  } catch {
    return null;
  }
}
