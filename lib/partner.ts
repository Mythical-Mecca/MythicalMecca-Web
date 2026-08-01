import "server-only";
import { db } from "@/lib/db";
import { partners, partnerCategories, partnerGalleryItems } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { toMediaSrc } from "@/lib/media";

const useDb = !!process.env.DATABASE_URL;

export interface MyPartner {
  id: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  bio: string | null;
  isPremium: boolean;
  categoryId: string | null;
  socials: { raw?: string } | null;
}

export interface GalleryItem {
  id: string;
  kind: "art" | "product";
  imageUrl: string | null;
  title: string | null;
  caption: string | null;
  externalUrl: string | null;
}

export async function getMyPartner(userId: string): Promise<MyPartner | null> {
  if (!useDb) return null;
  try {
    const rows = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, userId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      slug: r.slug,
      businessName: r.businessName,
      tagline: r.tagline,
      bio: r.bio,
      isPremium: r.isPremium,
      categoryId: r.categoryId,
      socials: (r.socials as { raw?: string }) ?? null,
    };
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
  hasUser: boolean;
  socialsRaw: string | null;
  createdAt: string;
}

function rawSocials(socials: unknown): string | null {
  if (!socials) return null;
  if (typeof socials === "object" && "raw" in (socials as Record<string, unknown>)) {
    return ((socials as { raw?: string }).raw as string) ?? null;
  }
  return null;
}

/** All partners with their category — admin list. */
export async function listPartners(): Promise<AdminPartner[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ p: partners, c: partnerCategories })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .orderBy(desc(partners.isPremium), asc(partners.businessName));
    return rows.map(({ p, c }) => ({
      id: p.id,
      slug: p.slug,
      businessName: p.businessName,
      tagline: p.tagline,
      bio: p.bio,
      isPremium: p.isPremium,
      active: p.active,
      categoryId: p.categoryId,
      categoryName: c?.name ?? null,
      hasUser: !!p.userId,
      socialsRaw: rawSocials(p.socials),
      createdAt: p.createdAt.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

export async function getPartnerById(id: string): Promise<AdminPartner | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({ p: partners, c: partnerCategories })
      .from(partners)
      .leftJoin(partnerCategories, eq(partners.categoryId, partnerCategories.id))
      .where(eq(partners.id, id))
      .limit(1);
    if (!row) return null;
    const { p, c } = row;
    return {
      id: p.id,
      slug: p.slug,
      businessName: p.businessName,
      tagline: p.tagline,
      bio: p.bio,
      isPremium: p.isPremium,
      active: p.active,
      categoryId: p.categoryId,
      categoryName: c?.name ?? null,
      hasUser: !!p.userId,
      socialsRaw: rawSocials(p.socials),
      createdAt: p.createdAt.toISOString().slice(0, 10),
    };
  } catch {
    return null;
  }
}
