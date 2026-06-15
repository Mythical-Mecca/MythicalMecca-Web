"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, vendorApplications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logging";

const profileSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) redirect("/profile?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(users)
        .set({ name: parsed.data.name })
        .where(eq(users.id, session.user.id));
    } catch {
      redirect("/profile?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "profile.update",
  });
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

const SOCIAL_KEYS = [
  "instagram",
  "youtube",
  "tiktok",
  "x",
  "website",
] as const;

const applicationSchema = z.object({
  businessName: z.string().max(160).optional(),
  description: z.string().min(10).max(2000),
  images: z.array(z.string().url()).min(1).max(8),
});

export type ApplicationFormState = { error?: string };

export async function submitVendorApplication(
  _prev: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const images = formData.getAll("images").map(String).filter(Boolean);
  const socials: Record<string, string> = {};
  for (const k of SOCIAL_KEYS) {
    const v = String(formData.get(`social_${k}`) ?? "").trim();
    if (v) socials[k] = v;
  }

  const parsed = applicationSchema.safeParse({
    businessName: formData.get("businessName") || undefined,
    description: formData.get("description"),
    images,
  });
  if (!parsed.success) {
    return {
      error:
        images.length === 0
          ? "Add at least one demo image."
          : "Add a description (10+ characters) and at least one image.",
    };
  }

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(vendorApplications).values({
        userId: session.user.id,
        businessName: parsed.data.businessName,
        pitch: parsed.data.description,
        images: parsed.data.images,
        socials: Object.keys(socials).length ? socials : undefined,
      });
    } catch {
      return { error: "Could not submit your application. Please try again." };
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "vendor_application.submit",
  });
  redirect("/vendor-application?sent=1");
}
