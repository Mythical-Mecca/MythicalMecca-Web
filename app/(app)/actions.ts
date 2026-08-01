"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, partnerApplications, reviews } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { auth, signIn } from "@/lib/auth";
import { logActivity } from "@/lib/logging";

export async function linkSocial(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const provider = String(formData.get("provider"));
  if (provider !== "google" && provider !== "discord") redirect("/profile");
  // Signing in while authenticated links the new provider to this profile.
  await signIn(provider, { redirectTo: "/profile?linked=1" });
}

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

  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const bannerUrl = String(formData.get("bannerUrl") ?? "").trim();

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(users)
        .set({
          name: parsed.data.name,
          // only overwrite when a new image was uploaded
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(bannerUrl ? { bannerUrl } : {}),
        })
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

export type ApplicationFormState = { error?: string };

const detailsSchema = z.object({
  businessName: z.string().max(160).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(10).max(2000),
});

// Step 1 — save the application details (creates/updates a DB draft).
export async function startApplication(
  _prev: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!process.env.DATABASE_URL) {
    return { error: "Applications need a database — DATABASE_URL isn't set." };
  }

  const socials: Record<string, string> = {};
  for (const k of SOCIAL_KEYS) {
    const v = String(formData.get(`social_${k}`) ?? "").trim();
    if (v) socials[k] = v;
  }
  const parsed = detailsSchema.safeParse({
    businessName: formData.get("businessName") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: "Add a description of your products (10+ characters)." };
  }

  try {
    const [draft] = await db
      .select({ id: partnerApplications.id })
      .from(partnerApplications)
      .where(
        and(
          eq(partnerApplications.userId, session.user.id),
          eq(partnerApplications.status, "draft")
        )
      )
      .limit(1);

    const values = {
      businessName: parsed.data.businessName ?? null,
      categoryId: parsed.data.categoryId ?? null,
      pitch: parsed.data.description,
      socials: Object.keys(socials).length ? socials : null,
      updatedAt: new Date(),
    };

    if (draft) {
      await db
        .update(partnerApplications)
        .set(values)
        .where(eq(partnerApplications.id, draft.id));
    } else {
      await db.insert(partnerApplications).values({
        userId: session.user.id,
        status: "draft",
        images: [],
        ...values,
      });
    }
  } catch {
    return { error: "Could not save your details. Please try again." };
  }

  await logActivity({ actorId: session.user.id, action: "partner_application.draft" });
  redirect("/apply?step=2");
}

const imagesSchema = z.object({
  images: z.array(z.string().url()).min(1).max(8),
});

// Step 2 — attach the uploaded images to the draft and submit it.
export async function submitDraftApplication(
  _prev: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const images = formData.getAll("images").map(String).filter(Boolean);
  const parsed = imagesSchema.safeParse({ images });
  if (!parsed.success) return { error: "Add at least one demo image." };

  if (process.env.DATABASE_URL) {
    try {
      const [draft] = await db
        .select({ id: partnerApplications.id })
        .from(partnerApplications)
        .where(
          and(
            eq(partnerApplications.userId, session.user.id),
            eq(partnerApplications.status, "draft")
          )
        )
        .orderBy(desc(partnerApplications.createdAt))
        .limit(1);
      if (!draft) {
        return { error: "No draft found — please start the application again." };
      }
      await db
        .update(partnerApplications)
        .set({
          images: parsed.data.images,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(partnerApplications.id, draft.id));
    } catch {
      return { error: "Could not submit your application. Please try again." };
    }
  }
  await logActivity({ actorId: session.user.id, action: "partner_application.submit" });
  redirect("/apply?sent=1");
}

// ---------------------------------------------------------------------------
// Partner reviews. Logged-in only; submitted as `pending` for admin approval.
// `isAnonymous` only hides the name publicly.
// ---------------------------------------------------------------------------
const reviewSchema = z.object({
  targetType: z.literal("partner"),
  targetId: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().min(4).max(2000),
});

export async function submitReview(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const redirectTo = `/partners/${String(formData.get("partnerSlug") ?? "")}`;

  const parsed = reviewSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId") || undefined,
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`${redirectTo}?review=error`);

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(reviews).values({
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId ?? null,
        userId: session.user.id,
        rating: parsed.data.rating,
        body: parsed.data.body,
        isAnonymous: formData.get("isAnonymous") != null,
        status: "pending",
      });
    } catch {
      redirect(`${redirectTo}?review=error`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "review.submit",
    entityType: parsed.data.targetType,
    entityId: parsed.data.targetId ?? undefined,
  });
  revalidatePath(redirectTo);
  redirect(`${redirectTo}?review=thanks`);
}
