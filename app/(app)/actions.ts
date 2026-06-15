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

const applicationSchema = z.object({
  businessName: z.string().min(2).max(160),
  pitch: z.string().min(20).max(4000),
  socials: z.string().max(500).optional(),
});

export async function submitVendorApplication(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = applicationSchema.safeParse({
    businessName: formData.get("businessName"),
    pitch: formData.get("pitch"),
    socials: formData.get("socials") || undefined,
  });
  if (!parsed.success) redirect("/vendor-application?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(vendorApplications).values({
        userId: session.user.id,
        businessName: parsed.data.businessName,
        pitch: parsed.data.pitch,
        socials: parsed.data.socials
          ? { raw: parsed.data.socials }
          : undefined,
      });
    } catch {
      redirect("/vendor-application?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "vendor_application.submit",
  });
  redirect("/vendor-application?sent=1");
}
