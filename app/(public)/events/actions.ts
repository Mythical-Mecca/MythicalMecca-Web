"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { eventComments, eventReviews } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eventIdBySlug } from "@/lib/events-social";
import { getEvent, isEventStarted } from "@/lib/content";
import { logActivity } from "@/lib/logging";

const commentSchema = z.object({
  slug: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export async function addComment(formData: FormData) {
  const session = await auth();
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?from=/events/${slug}`);

  const parsed = commentSchema.safeParse({
    slug,
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`/events/${slug}?cerror=1#comments`);

  if (process.env.DATABASE_URL) {
    try {
      const id = await eventIdBySlug(slug);
      if (id) {
        await db.insert(eventComments).values({
          eventId: id,
          userId: session.user.id,
          body: parsed.data.body,
        });
      }
    } catch {
      redirect(`/events/${slug}?cerror=1#comments`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.comment",
    entityType: "event",
  });
  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}#comments`);
}

const reviewSchema = z.object({
  slug: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export async function addReview(formData: FormData) {
  const session = await auth();
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?from=/events/${slug}`);

  const parsed = reviewSchema.safeParse({
    slug,
    rating: formData.get("rating"),
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) redirect(`/events/${slug}?rerror=1#reviews`);

  // Reviews are gated to the day of the event and after.
  const event = await getEvent(slug);
  if (!event || !isEventStarted(event)) {
    redirect(`/events/${slug}?rerror=locked#reviews`);
  }

  if (process.env.DATABASE_URL) {
    try {
      const id = await eventIdBySlug(slug);
      if (id) {
        await db
          .insert(eventReviews)
          .values({
            eventId: id,
            userId: session.user.id,
            rating: parsed.data.rating,
            body: parsed.data.body,
          })
          .onConflictDoUpdate({
            target: [eventReviews.eventId, eventReviews.userId],
            set: {
              rating: parsed.data.rating,
              body: parsed.data.body,
              updatedAt: new Date(),
            },
          });
      }
    } catch {
      redirect(`/events/${slug}?rerror=1#reviews`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.review",
    entityType: "event",
  });
  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}#reviews`);
}
