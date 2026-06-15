"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { vendors, vendorGalleryItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { logActivity } from "@/lib/logging";

async function requireVendor() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "vendor")) redirect("/dashboard");
  return session;
}

const manufacturerSchema = z.object({
  tagline: z.string().max(160).optional(),
  bio: z.string().max(2000).optional(),
  socials: z.string().max(500).optional(),
});

export async function updateManufacturer(formData: FormData) {
  const session = await requireVendor();
  const parsed = manufacturerSchema.safeParse({
    tagline: formData.get("tagline") || undefined,
    bio: formData.get("bio") || undefined,
    socials: formData.get("socials") || undefined,
  });
  if (!parsed.success) redirect("/forge/profile?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(vendors)
        .set({
          tagline: parsed.data.tagline,
          bio: parsed.data.bio,
          socials: parsed.data.socials ? { raw: parsed.data.socials } : null,
          updatedAt: new Date(),
        })
        .where(eq(vendors.userId, session.user.id));
    } catch {
      redirect("/forge/profile?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "vendor.update" });
  revalidatePath("/forge/profile");
  redirect("/forge/profile?saved=1");
}

const gallerySchema = z.object({
  caption: z.string().max(300).optional(),
  images: z.array(z.string().url()).min(1).max(12),
});

export async function addGalleryItem(formData: FormData) {
  const session = await requireVendor();
  const images = formData.getAll("images").map(String).filter(Boolean);
  const parsed = gallerySchema.safeParse({
    caption: formData.get("caption") || undefined,
    images,
  });
  if (!parsed.success) redirect("/forge/gallery?error=1");

  if (process.env.DATABASE_URL) {
    try {
      const [v] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, session.user.id))
        .limit(1);
      if (v) {
        await db.insert(vendorGalleryItems).values(
          parsed.data.images.map((url) => ({
            vendorId: v.id,
            imageUrl: url,
            caption: parsed.data.caption,
          }))
        );
      }
    } catch {
      redirect("/forge/gallery?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "vendor.gallery.add" });
  revalidatePath("/forge/gallery");
  redirect("/forge/gallery?saved=1");
}

export async function removeGalleryItem(formData: FormData) {
  const session = await requireVendor();
  const id = String(formData.get("id"));

  if (process.env.DATABASE_URL) {
    try {
      const [v] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, session.user.id))
        .limit(1);
      if (v) {
        await db
          .delete(vendorGalleryItems)
          .where(
            and(
              eq(vendorGalleryItems.id, id),
              eq(vendorGalleryItems.vendorId, v.id)
            )
          );
      }
    } catch {
      redirect("/forge/gallery?error=1");
    }
  }
  revalidatePath("/forge/gallery");
  redirect("/forge/gallery?saved=1");
}
