"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  eventComments,
  eventReviews,
  eventInterests,
  chatMessages,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { eventIdBySlug } from "@/lib/events-social";
import { getEvent, isEventStarted } from "@/lib/content";
import { canAccessChatScope, type ChatMessageView } from "@/lib/chat";
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

const chatSchema = z.object({
  scopeType: z.enum(["event"]),
  scopeId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

/**
 * Send a chat message. Called programmatically from the chat client (not a
 * form) — returns the created message for optimistic rendering.
 */
export async function sendChatMessage(input: {
  scopeType: "event";
  scopeId: string;
  body: string;
}): Promise<{ ok: boolean; message?: ChatMessageView }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  const parsed = chatSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  if (!process.env.DATABASE_URL) return { ok: false };

  const allowed = await canAccessChatScope(
    parsed.data.scopeType,
    parsed.data.scopeId
  );
  if (!allowed) return { ok: false };

  try {
    const [created] = await db
      .insert(chatMessages)
      .values({
        scopeType: parsed.data.scopeType,
        scopeId: parsed.data.scopeId,
        userId: session.user.id,
        body: parsed.data.body.trim(),
      })
      .returning();
    await logActivity({
      actorId: session.user.id,
      action: "chat.send",
      entityType: parsed.data.scopeType,
      entityId: parsed.data.scopeId,
    });
    return {
      ok: true,
      message: {
        id: created.id,
        userId: created.userId,
        author: session.user.name ?? "Adventurer",
        avatarUrl: null,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch {
    return { ok: false };
  }
}

/** "Interested" mark on an external event (idempotent). */
export async function markInterested(formData: FormData) {
  const session = await auth();
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?from=/events/${slug}`);

  if (process.env.DATABASE_URL) {
    try {
      const id = await eventIdBySlug(slug);
      if (id) {
        await db
          .insert(eventInterests)
          .values({ eventId: id, userId: session.user.id })
          .onConflictDoNothing();
      }
    } catch {
      redirect(`/events/${slug}?ierror=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.interested",
    entityType: "event",
  });
  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}`);
}

export async function unmarkInterested(formData: FormData) {
  const session = await auth();
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?from=/events/${slug}`);

  if (process.env.DATABASE_URL) {
    try {
      const id = await eventIdBySlug(slug);
      if (id) {
        await db
          .delete(eventInterests)
          .where(
            and(
              eq(eventInterests.eventId, id),
              eq(eventInterests.userId, session.user.id)
            )
          );
      }
    } catch {
      redirect(`/events/${slug}?ierror=1`);
    }
  }
  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}`);
}
