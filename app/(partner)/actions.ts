"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { partners, partnerGalleryItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { logActivity } from "@/lib/logging";

async function requirePartner() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "partner")) redirect("/dashboard");
  return session;
}

const manufacturerSchema = z.object({
  tagline: z.string().max(160).optional(),
  bio: z.string().max(2000).optional(),
  socials: z.string().max(500).optional(),
});

export async function updateManufacturer(formData: FormData) {
  const session = await requirePartner();
  const parsed = manufacturerSchema.safeParse({
    tagline: formData.get("tagline") || undefined,
    bio: formData.get("bio") || undefined,
    socials: formData.get("socials") || undefined,
  });
  if (!parsed.success) redirect("/partner-hub/profile?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({
          tagline: parsed.data.tagline,
          bio: parsed.data.bio,
          socials: parsed.data.socials ? { raw: parsed.data.socials } : null,
          updatedAt: new Date(),
        })
        .where(eq(partners.userId, session.user.id));
    } catch {
      redirect("/partner-hub/profile?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "partner.update" });
  revalidatePath("/partner-hub/profile");
  redirect("/partner-hub/profile?saved=1");
}

const gallerySchema = z.object({
  caption: z.string().max(300).optional(),
  kind: z.enum(["art", "product"]).default("art"),
  images: z.array(z.string().url()).min(1).max(12),
});

export async function addGalleryItem(formData: FormData) {
  const session = await requirePartner();
  const images = formData.getAll("images").map(String).filter(Boolean);
  const parsed = gallerySchema.safeParse({
    caption: formData.get("caption") || undefined,
    kind: formData.get("kind") || undefined,
    images,
  });
  if (!parsed.success) redirect("/partner-hub/gallery?error=1");

  if (process.env.DATABASE_URL) {
    try {
      const [partner] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.userId, session.user.id))
        .limit(1);
      if (partner) {
        await db.insert(partnerGalleryItems).values(
          parsed.data.images.map((url) => ({
            partnerId: partner.id,
            imageUrl: url,
            caption: parsed.data.caption,
            kind: parsed.data.kind,
          }))
        );
      }
    } catch {
      redirect("/partner-hub/gallery?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "partner.gallery.add" });
  revalidatePath("/partner-hub/gallery");
  redirect("/partner-hub/gallery?saved=1");
}

export async function removeGalleryItem(formData: FormData) {
  const session = await requirePartner();
  const id = String(formData.get("id"));

  if (process.env.DATABASE_URL) {
    try {
      const [partner] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.userId, session.user.id))
        .limit(1);
      if (partner) {
        await db
          .delete(partnerGalleryItems)
          .where(
            and(
              eq(partnerGalleryItems.id, id),
              eq(partnerGalleryItems.partnerId, partner.id)
            )
          );
      }
    } catch {
      redirect("/partner-hub/gallery?error=1");
    }
  }
  revalidatePath("/partner-hub/gallery");
  redirect("/partner-hub/gallery?saved=1");
}
