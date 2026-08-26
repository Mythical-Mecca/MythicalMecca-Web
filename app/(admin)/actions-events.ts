"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  events,
  chatMessages,
  partners,
  eventGalleryItems,
  eventComments,
  eventReviews,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { logActivity } from "@/lib/logging";
import { announceEvent } from "@/lib/discord";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "admin")) redirect("/dashboard");
  return session;
}

/** Publish a pending community submission. */
export async function approveCommunityEvent(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").slice(0, 500) || null;

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(events)
        .set({
          status: "published",
          reviewedBy: session.user.id,
          reviewNote: note,
          updatedAt: new Date(),
        })
        .where(and(eq(events.id, id), eq(events.origin, "community")));
    } catch {
      redirect("/admin/events/queue?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.community_approve",
    entityType: "event",
    entityId: id,
  });
  revalidatePath("/admin/events/queue");
  revalidatePath("/events");
  redirect("/admin/events/queue?done=1");
}

/**
 * Soft-delete a chat message (admin moderation). Called programmatically
 * from the chat client; returns success for optimistic removal.
 */
export async function deleteChatMessage(
  messageId: string
): Promise<{ ok: boolean }> {
  const session = await requireAdmin();
  if (!process.env.DATABASE_URL) return { ok: false };
  try {
    await db
      .update(chatMessages)
      .set({ deletedAt: new Date(), deletedBy: session.user.id })
      .where(eq(chatMessages.id, messageId));
    await logActivity({
      actorId: session.user.id,
      action: "chat.delete",
      entityType: "chat_message",
      entityId: messageId,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Reject a pending community submission. */
export async function rejectCommunityEvent(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").slice(0, 500) || null;

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(events)
        .set({
          status: "rejected",
          reviewedBy: session.user.id,
          reviewNote: note,
          updatedAt: new Date(),
        })
        .where(and(eq(events.id, id), eq(events.origin, "community")));
    } catch {
      redirect("/admin/events/queue?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.community_reject",
    entityType: "event",
    entityId: id,
  });
  revalidatePath("/admin/events/queue");
  redirect("/admin/events/queue?done=1");
}

// ---------------------------------------------------------------------------
// Inline editing (admin events table)
// ---------------------------------------------------------------------------

/**
 * Unlike the page actions above, these are called from event handlers and have
 * to *return* their failure rather than redirect: a `redirect()` here would
 * surface at the call site as a rejected promise and the cell would report a
 * network problem that never happened.
 */
async function adminOrNull() {
  const session = await auth();
  if (!session?.user || !roleAtLeast(session.user.role, "admin")) return null;
  return session;
}

const EVENT_STATUSES = [
  "draft",
  "published",
  "live",
  "ended",
  "cancelled",
  "pending",
  "rejected",
] as const;

const EVENT_ORIGINS = ["hosted", "partner", "external", "community"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => (v.trim() === "" ? null : v.trim()));

const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), {
      message: `Must be a number between ${min} and ${max}`,
    });

const optionalStamp = () =>
  z
    .string()
    .transform((v) => (v.trim() === "" ? null : new Date(v)))
    .refine((v) => v === null || !Number.isNaN(v.getTime()), {
      message: "Not a valid date",
    });

/**
 * Every column the table is allowed to write, and what counts as valid.
 *
 * A whitelist rather than a passthrough: this action is reachable by POST from
 * anywhere, so "which field" has to be as constrained as "which value" — the
 * alternative is handing an authenticated admin session the ability to set any
 * column on the row, `reviewedBy` and `createdBy` included.
 */
const EVENT_FIELDS = {
  title: z.string().trim().min(2, "Needs at least 2 characters").max(200),
  /**
   * Empty means "no public page". A non-public event is allowed to have no
   * slug at all; `publicNeedsSlug` below is what stops a *public* one from
   * being saved without one.
   */
  slug: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || (v.length >= 2 && v.length <= 120), {
      message: "Between 2 and 120 characters",
    })
    .refine((v) => v === null || /^[a-z0-9-]+$/.test(v), {
      message: "Lowercase letters, numbers and hyphens only",
    }),
  status: z.enum(EVENT_STATUSES),
  origin: z.enum(EVENT_ORIGINS),
  summary: optionalText(400),
  bodyMd: optionalText(20000),
  location: optionalText(200),
  lat: optionalNumber(-90, 90),
  lng: optionalNumber(-180, 180),
  startsAt: optionalStamp(),
  endsAt: optionalStamp(),
  capacity: optionalNumber(0, 1_000_000),
  partnerId: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || z.uuid().safeParse(v).success, {
      message: "Not a valid partner",
    }),
  sourceName: optionalText(200),
  externalUrl: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || z.url().safeParse(v).success, {
      message: "Must be an http(s) link",
    }),
  reviewNote: optionalText(500),
} as const;

export type EventField = keyof typeof EVENT_FIELDS;

export type FieldSaveResult = { ok: true } | { ok: false; error: string };

/** Statuses that put an event on the public site — mirrors lib/content.ts. */
const PUBLIC_STATUSES: readonly string[] = ["published", "live", "ended"];

/**
 * A public event needs an address.
 *
 * The two fields can be edited independently — one cell at a time from the
 * table, or together from the form — so the check has to consider the row's
 * resulting state rather than whichever field is being written. Returns an
 * error message, or null when the pair is coherent.
 */
function publicNeedsSlug(
  status: string,
  slug: string | null
): string | null {
  if (!PUBLIC_STATUSES.includes(status)) return null;
  if (slug) return null;
  return "A public event needs a slug — that is the URL its page lives at.";
}

/** Write one cell of one event. */
export async function updateEventField(
  id: string,
  field: string,
  value: string
): Promise<FieldSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown event." };

  if (!Object.prototype.hasOwnProperty.call(EVENT_FIELDS, field)) {
    return { ok: false, error: "That field can't be edited here." };
  }
  const key = field as EventField;
  const parsed = EVENT_FIELDS[key].safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid value." };
  }
  const next = parsed.data;

  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "No database configured." };
  }

  try {
    const [current] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    if (!current) return { ok: false, error: "Unknown event." };

    // A slug is a public URL. Colliding with another event would 404 one of
    // them, and the unique index would throw an opaque error at insert time.
    if (key === "slug") {
      const [clash] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, next as string))
        .limit(1);
      if (clash && clash.id !== id) {
        return { ok: false, error: "Another event already uses that slug." };
      }
    }

    if (key === "status" || key === "slug") {
      const nextStatus = key === "status" ? (next as string) : current.status;
      const nextSlug = key === "slug" ? (next as string | null) : current.slug;
      const problem = publicNeedsSlug(nextStatus, nextSlug);
      if (problem) return { ok: false, error: problem };
    }

    // The window has to stay a window, whichever end is being moved.
    if (key === "startsAt" || key === "endsAt") {
      const starts = key === "startsAt" ? (next as Date | null) : current.startsAt;
      const ends = key === "endsAt" ? (next as Date | null) : current.endsAt;
      if (starts && ends && ends.getTime() < starts.getTime()) {
        return { ok: false, error: "The end has to come after the start." };
      }
    }

    // Clearing the origin's supporting field is fine; pointing at a partner
    // that doesn't exist is not.
    if (key === "partnerId" && next !== null) {
      const [p] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.id, next as string))
        .limit(1);
      if (!p) return { ok: false, error: "That partner no longer exists." };
    }

    await db
      .update(events)
      .set({ [key]: next, updatedAt: new Date() })
      .where(eq(events.id, id));
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  await logActivity({
    actorId: session.user.id,
    action: "event.field_update",
    entityType: "event",
    entityId: id,
    metadata: { field: key },
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

/** Move a batch of events to one status — the table's bulk action. */
export async function setEventsStatus(
  ids: string[],
  status: string
): Promise<FieldSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };

  const parsedStatus = z.enum(EVENT_STATUSES).safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: "Unknown status." };

  const clean = ids.filter((id) => z.uuid().safeParse(id).success);
  if (clean.length === 0) return { ok: false, error: "Nothing selected." };

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(events)
        .set({ status: parsedStatus.data, updatedAt: new Date() })
        .where(inArray(events.id, clean));
    } catch {
      return { ok: false, error: "Could not update those events." };
    }
  }

  await logActivity({
    actorId: session.user.id,
    action: "event.bulk_status",
    entityType: "event",
    metadata: { status: parsedStatus.data, count: clean.length },
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The per-event management page
// ---------------------------------------------------------------------------

const backTo = (id: string, tab: string, flag: string) =>
  `/admin/events/${id}?tab=${tab}&${flag}=1`;

/**
 * Save the whole details form.
 *
 * Reuses `EVENT_FIELDS` field by field rather than defining a second schema —
 * one source of truth for what a valid event looks like, whether it arrives a
 * cell at a time from the table or all at once from here.
 */
export async function updateEvent(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  if (!z.uuid().safeParse(id).success) redirect("/admin/events");

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(EVENT_FIELDS) as EventField[]) {
    const raw = formData.get(key);
    // A field absent from the form is left alone; only what was submitted is
    // written, so a narrower form can reuse this action safely.
    if (raw === null) continue;
    const parsed = EVENT_FIELDS[key].safeParse(String(raw));
    if (!parsed.success) redirect(backTo(id, "details", "error"));
    patch[key] = parsed.data;
  }

  const starts = (patch.startsAt as Date | null | undefined) ?? null;
  const ends = (patch.endsAt as Date | null | undefined) ?? null;
  if (starts && ends && ends.getTime() < starts.getTime()) {
    redirect(backTo(id, "details", "badwindow"));
  }

  // A public status with no address would list an event whose page 404s. The
  // form submits both fields together, so this can be judged here.
  if (
    typeof patch.status === "string" &&
    publicNeedsSlug(patch.status, (patch.slug as string | null) ?? null)
  ) {
    redirect(backTo(id, "details", "needslug"));
  }

  if (process.env.DATABASE_URL) {
    let clashed = false;
    try {
      if (typeof patch.slug === "string") {
        const [clash] = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.slug, patch.slug))
          .limit(1);
        clashed = !!clash && clash.id !== id;
      }
      if (!clashed) {
        await db
          .update(events)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(events.id, id));
      }
    } catch {
      redirect(backTo(id, "details", "error"));
    }
    // Outside the try: `redirect` works by throwing, and catching it here
    // would turn every successful redirect into a save failure.
    if (clashed) redirect(backTo(id, "details", "slug"));
  }

  await logActivity({
    actorId: session.user.id,
    action: "event.update",
    entityType: "event",
    entityId: id,
    metadata: { fields: Object.keys(patch) },
  });
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect(backTo(id, "details", "saved"));
}

/** Re-announce an event in Discord — after a reschedule, or a missed post. */
export async function announceEventOnDiscord(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  let posted = false;

  if (process.env.DATABASE_URL) {
    const [e] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    // Nothing to announce for an event with no public page to link to.
    if (e?.startsAt && e.slug) {
      posted = await announceEvent({
        title: e.title,
        summary: e.summary,
        location: e.location,
        startsAt: e.startsAt,
        slug: e.slug,
      });
      await logActivity({
        actorId: session.user.id,
        action: "event.announce",
        entityType: "event",
        entityId: id,
        metadata: { posted },
      });
    }
  }
  redirect(backTo(id, "details", posted ? "announced" : "error"));
}

/**
 * Delete an event and everything hanging off it.
 *
 * The gallery, comments, chat, reviews and interest marks all cascade; an
 * attached quest does not — its `event_id` is set to null and the quest lives
 * on, which is why the page says so before you press this.
 */
export async function deleteEvent(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  if (!z.uuid().safeParse(id).success) redirect("/admin/events");

  if (process.env.DATABASE_URL) {
    try {
      await db.delete(events).where(eq(events.id, id));
    } catch {
      redirect(backTo(id, "danger", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.delete",
    entityType: "event",
    entityId: id,
  });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events?deleted=1");
}

// ---- gallery ---------------------------------------------------------------

export async function addEventGalleryImages(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const images = formData.getAll("images").map(String).filter(Boolean);
  if (!images.length) redirect(backTo(id, "gallery", "error"));

  if (process.env.DATABASE_URL) {
    try {
      const [last] = await db
        .select({
          max: sql<number>`coalesce(max(${eventGalleryItems.sort}), -1)::int`,
        })
        .from(eventGalleryItems)
        .where(eq(eventGalleryItems.eventId, id));
      const base = (last?.max ?? -1) + 1;
      await db
        .insert(eventGalleryItems)
        .values(
          images.map((imageUrl, i) => ({ eventId: id, imageUrl, sort: base + i }))
        );
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.gallery_add",
    entityType: "event",
    entityId: id,
    metadata: { count: images.length },
  });
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  redirect(backTo(id, "gallery", "saved"));
}

export async function removeEventGalleryImage(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const imageId = String(formData.get("imageId"));

  if (process.env.DATABASE_URL) {
    try {
      await db
        .delete(eventGalleryItems)
        .where(
          and(
            eq(eventGalleryItems.id, imageId),
            eq(eventGalleryItems.eventId, id)
          )
        );
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.gallery_remove",
    entityType: "event",
    entityId: id,
  });
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  redirect(backTo(id, "gallery", "saved"));
}

export async function setEventGalleryCaption(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const imageId = String(formData.get("imageId"));
  const caption = String(formData.get("caption") ?? "").slice(0, 200) || null;

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(eventGalleryItems)
        .set({ caption })
        .where(
          and(
            eq(eventGalleryItems.id, imageId),
            eq(eventGalleryItems.eventId, id)
          )
        );
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  redirect(backTo(id, "gallery", "saved"));
}

/** Move an image one place in the gallery order. */
export async function moveEventGalleryImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const imageId = String(formData.get("imageId"));
  const dir = String(formData.get("dir")) === "up" ? -1 : 1;

  if (process.env.DATABASE_URL) {
    try {
      const items = await db
        .select()
        .from(eventGalleryItems)
        .where(eq(eventGalleryItems.eventId, id))
        .orderBy(eventGalleryItems.sort, eventGalleryItems.createdAt);
      const i = items.findIndex((x) => x.id === imageId);
      const j = i + dir;
      if (i >= 0 && j >= 0 && j < items.length) {
        // Rewrite the whole run rather than swapping two values: `sort`
        // defaults to 0, so an older gallery can hold ties that a pure swap
        // would leave untouched.
        const reordered = [...items];
        const [moved] = reordered.splice(i, 1);
        reordered.splice(j, 0, moved!);
        for (const [sort, item] of reordered.entries()) {
          if (item.sort !== sort) {
            await db
              .update(eventGalleryItems)
              .set({ sort })
              .where(eq(eventGalleryItems.id, item.id));
          }
        }
      }
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  redirect(backTo(id, "gallery", "saved"));
}

// ---- community moderation --------------------------------------------------

/** Soft-delete or restore a comment; the row is kept for the audit trail. */
export async function setEventCommentDeleted(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const commentId = String(formData.get("commentId"));
  const deleted = String(formData.get("deleted")) === "1";

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(eventComments)
        .set({ deletedAt: deleted ? new Date() : null })
        .where(
          and(eq(eventComments.id, commentId), eq(eventComments.eventId, id))
        );
    } catch {
      redirect(backTo(id, "community", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: deleted ? "event.comment_delete" : "event.comment_restore",
    entityType: "event_comment",
    entityId: commentId,
  });
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  redirect(backTo(id, "community", "saved"));
}

export async function setEventChatDeleted(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const messageId = String(formData.get("messageId"));
  const deleted = String(formData.get("deleted")) === "1";

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(chatMessages)
        .set({
          deletedAt: deleted ? new Date() : null,
          deletedBy: deleted ? session.user.id : null,
        })
        .where(and(eq(chatMessages.id, messageId), eq(chatMessages.scopeId, id)));
    } catch {
      redirect(backTo(id, "community", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: deleted ? "chat.delete" : "chat.restore",
    entityType: "chat_message",
    entityId: messageId,
  });
  revalidatePath(`/admin/events/${id}`);
  redirect(backTo(id, "community", "saved"));
}

/**
 * Reviews have no deleted flag and one row per person, so removing one is a
 * real delete — and it frees that person to write another.
 */
export async function deleteEventReview(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const reviewId = String(formData.get("reviewId"));

  if (process.env.DATABASE_URL) {
    try {
      await db
        .delete(eventReviews)
        .where(and(eq(eventReviews.id, reviewId), eq(eventReviews.eventId, id)));
    } catch {
      redirect(backTo(id, "community", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "event.review_delete",
    entityType: "event_review",
    entityId: reviewId,
  });
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  redirect(backTo(id, "community", "saved"));
}
