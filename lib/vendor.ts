import "server-only";
import { db } from "@/lib/db";
import { vendors, vendorGalleryItems } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

const useDb = !!process.env.DATABASE_URL;

export interface MyVendor {
  id: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  bio: string | null;
  division: string | null;
  socials: { raw?: string } | null;
}

export interface GalleryItem {
  id: string;
  title: string | null;
  caption: string | null;
  externalUrl: string | null;
}

export async function getMyVendor(userId: string): Promise<MyVendor | null> {
  if (!useDb) return null;
  try {
    const rows = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, userId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      slug: r.slug,
      businessName: r.businessName,
      tagline: r.tagline,
      bio: r.bio,
      division: r.division,
      socials: (r.socials as { raw?: string }) ?? null,
    };
  } catch {
    return null;
  }
}

export async function listMyGallery(vendorId: string): Promise<GalleryItem[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select()
      .from(vendorGalleryItems)
      .where(eq(vendorGalleryItems.vendorId, vendorId))
      .orderBy(asc(vendorGalleryItems.sort));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      caption: r.caption,
      externalUrl: r.externalUrl,
    }));
  } catch {
    return [];
  }
}
