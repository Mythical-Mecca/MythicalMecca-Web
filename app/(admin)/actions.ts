"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  events,
  partners,
  partnerCategories,
  partnerApplications,
  partnerGalleryItems,
  partnerMembers,
  reviews,
  users,
  galleryItems,
  eventGalleryItems,
  scavengerHunts,
  huntSteps,
  huntStations,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { ensureStation } from "@/lib/hunts";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { logActivity } from "@/lib/logging";
import { announceEvent } from "@/lib/discord";
import { parseSocials, toStoredSocials } from "@/lib/socials";
import { httpUrl } from "@/lib/url";
import { sanitizeEasyModeHtml } from "@/lib/easy-mode-html";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "admin")) redirect("/");
  return session;
}

const eventSchema = z.object({
  title: z.string().min(2).max(200),
  summary: z.string().max(400).optional(),
  bodyMd: z.string().optional(),
  location: z.string().max(200).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  origin: z.enum(["hosted", "partner", "external"]).default("hosted"),
  partnerId: z.string().uuid().optional(),
  sourceName: z.string().max(200).optional(),
  // Rendered as an href on the event page. z.string().url() would accept
  // javascript:, so scheme-check it even though only admins reach this form.
  externalUrl: httpUrl().optional(),
});

export type EventFormState = { error?: string };

export async function createEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const session = await requireAdmin();
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    bodyMd: formData.get("bodyMd") || undefined,
    location: formData.get("location") || undefined,
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    origin: formData.get("origin") || "hosted",
    partnerId: formData.get("partnerId") || undefined,
    sourceName: formData.get("sourceName") || undefined,
    externalUrl: formData.get("externalUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: "Add a title (2+ characters) and pick a date and time." };
  }

  const images = formData.getAll("eventImages").map(String).filter(Boolean);
  const toDiscord = formData.get("postToDiscord") != null;
  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  const startsAt = new Date(parsed.data.startsAt);

  if (process.env.DATABASE_URL) {
    try {
      const [created] = await db
        .insert(events)
        .values({
          slug,
          title: parsed.data.title,
          summary: parsed.data.summary,
          bodyMd: parsed.data.bodyMd,
          location: parsed.data.location,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          startsAt,
          endsAt: new Date(parsed.data.endsAt),
          status: "published",
          origin: parsed.data.origin,
          partnerId:
            parsed.data.origin === "partner" ? parsed.data.partnerId : undefined,
          sourceName:
            parsed.data.origin === "external" ? parsed.data.sourceName : undefined,
          externalUrl:
            parsed.data.origin === "external" ? parsed.data.externalUrl : undefined,
          createdBy: session.user.id,
        })
        .returning({ id: events.id });
      if (created && images.length) {
        await db.insert(eventGalleryItems).values(
          images.map((url, sort) => ({
            eventId: created.id,
            imageUrl: url,
            sort,
          }))
        );
      }
    } catch {
      return { error: "Could not save the event. Please try again." };
    }

    if (toDiscord) {
      await announceEvent({
        title: parsed.data.title,
        summary: parsed.data.summary,
        location: parsed.data.location,
        startsAt,
        slug,
      });
    }
  }
  await logActivity({ actorId: session.user.id, action: "event.create" });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events?created=1");
}

export async function approveApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "");
  let newSlug: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const [app] = await db
        .select()
        .from(partnerApplications)
        .where(eq(partnerApplications.id, id))
        .limit(1);
      if (app) {
        await db
          .update(partnerApplications)
          .set({
            status: "approved",
            reviewedBy: session.user.id,
            reviewNote: note || null,
            updatedAt: new Date(),
          })
          .where(eq(partnerApplications.id, id));
        // Promote only from `member` — an admin who applied must stay an admin.
        await db
          .update(users)
          .set({ role: "partner" })
          .where(and(eq(users.id, app.userId), eq(users.role, "member")));

        const storeName = app.businessName || "New stall";
        const slug = `${slugify(storeName)}-${Date.now().toString(36)}`;
        // Approving an application publishes immediately — unlike a self-serve
        // page, this content has just been reviewed.
        const [created] = await db
          .insert(partners)
          .values({
            categoryId: app.categoryId,
            slug,
            businessName: storeName,
            tagline: app.pitch.slice(0, 140),
            // The wizard already collects the keyed shape the public page reads.
            socials: toStoredSocials(parseSocials(app.socials)),
            status: "approved",
            reviewedBy: session.user.id,
          })
          .returning({ id: partners.id });

        if (created) {
          newSlug = slug;
          // The applicant owns the page they just had approved.
          await db
            .insert(partnerMembers)
            .values({
              partnerId: created.id,
              userId: app.userId,
              role: "owner",
              invitedBy: session.user.id,
            })
            .onConflictDoNothing();

          // Carry the application's images across as the opening gallery.
          const images = Array.isArray(app.images)
            ? (app.images as unknown[]).filter(
                (u): u is string => typeof u === "string" && !!u
              )
            : [];
          if (images.length) {
            await db.insert(partnerGalleryItems).values(
              images.map((url, i) => ({
                partnerId: created.id,
                imageUrl: url,
                sort: i,
              }))
            );
          }
        }
      }
    } catch {
      redirect("/admin/partners/applications?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner_application.approve",
    entityId: id,
  });
  revalidatePath("/admin/partners/applications");
  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  revalidatePath("/");
  if (newSlug) revalidatePath(`/partners/${newSlug}`);
  redirect("/admin/partners/applications?done=1");
}

export async function rejectApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  // A rejection with no reason is a door closing in silence. The form
  // requires it; this is the backstop for a submit that skipped the field.
  if (!note) redirect("/admin/partners/applications?error=note");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerApplications)
        .set({
          status: "rejected",
          reviewedBy: session.user.id,
          reviewNote: note || null,
          updatedAt: new Date(),
        })
        .where(eq(partnerApplications.id, id));
    } catch {
      redirect("/admin/partners/applications?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner_application.reject",
    entityId: id,
  });
  revalidatePath("/admin/partners/applications");
  redirect("/admin/partners/applications?done=1");
}

const galleryImagesSchema = z.object({
  caption: z.string().max(300).optional(),
  images: z.array(z.string().url()).min(1).max(24),
});

export async function addGalleryImages(formData: FormData) {
  const session = await requireAdmin();
  const images = formData.getAll("images").map(String).filter(Boolean);
  const parsed = galleryImagesSchema.safeParse({
    caption: formData.get("caption") || undefined,
    images,
  });
  if (!parsed.success) redirect("/admin/gallery?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(galleryItems).values(
        parsed.data.images.map((url) => ({
          imageUrl: url,
          caption: parsed.data.caption,
          uploadedBy: session.user.id,
        }))
      );
    } catch {
      redirect("/admin/gallery?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "gallery.add" });
  revalidatePath("/admin/gallery");
  revalidatePath("/");
  redirect("/admin/gallery?saved=1");
}

export async function removeGalleryImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (process.env.DATABASE_URL) {
    try {
      await db.delete(galleryItems).where(eq(galleryItems.id, id));
    } catch {
      redirect("/admin/gallery?error=1");
    }
  }
  revalidatePath("/admin/gallery");
  revalidatePath("/");
  redirect("/admin/gallery?saved=1");
}

// ---------------------------------------------------------------------------
// Gallery table — inline cell edits
//
// Same (id, field, value) contract as the events and quests tables: one cell
// at a time, a result rather than a redirect. The view counters are not in
// here on purpose — they are written by the public viewer and read-only to us.
// ---------------------------------------------------------------------------
export type GallerySaveResult = { ok: true } | { ok: false; error: string };

const GALLERY_FIELDS = {
  caption: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || v.length <= 300, { message: "Too long" }),
  published: z.string().transform((v) => v === "1"),
  sort: z.coerce
    .number()
    .int("Whole numbers only")
    .min(0, "Can't be negative")
    .max(999, "Too large"),
} as const;

type GalleryField = keyof typeof GALLERY_FIELDS;

export async function updateGalleryField(
  id: string,
  field: string,
  value: string
): Promise<GallerySaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown photo." };

  if (!Object.prototype.hasOwnProperty.call(GALLERY_FIELDS, field)) {
    return { ok: false, error: "That field can't be edited here." };
  }
  const key = field as GalleryField;
  const parsed = GALLERY_FIELDS[key].safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid value." };
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "No database configured." };
  }

  try {
    const updated = await db
      .update(galleryItems)
      .set({ [key]: parsed.data })
      .where(eq(galleryItems.id, id))
      .returning({ id: galleryItems.id });
    if (updated.length === 0) return { ok: false, error: "Unknown photo." };
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  await logActivity({
    actorId: session.user.id,
    action: "gallery.field_update",
    entityType: "gallery",
    entityId: id,
    metadata: { field: key },
  });

  revalidatePath("/admin/gallery");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Partner categories
// ---------------------------------------------------------------------------
const bool = (fd: FormData, key: string) => fd.get(key) != null;

const categorySettingColumns = (fd: FormData) => ({
  requiresApplication: bool(fd, "requiresApplication"),
  allowSelfManage: bool(fd, "allowSelfManage"),
  allowAdminManage: bool(fd, "allowAdminManage"),
  showProducts: bool(fd, "showProducts"),
  showArt: bool(fd, "showArt"),
  showReviews: bool(fd, "showReviews"),
  showSocials: bool(fd, "showSocials"),
  showGallery: bool(fd, "showGallery"),
  hasPremiumOption: bool(fd, "hasPremiumOption"),
  featuredOnHome: bool(fd, "featuredOnHome"),
  active: bool(fd, "active"),
});

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  icon: z.string().max(80).optional(),
  color: z.string().max(20).optional(),
  sort: z.coerce.number().int().min(0).max(999).optional(),
});

export async function createCategory(formData: FormData) {
  const session = await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
    sort: formData.get("sort") || undefined,
  });
  if (!parsed.success) redirect("/admin/partners/categories?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(partnerCategories).values({
        slug: `${slugify(parsed.data.name)}-${Date.now().toString(36)}`,
        name: parsed.data.name,
        description: parsed.data.description,
        icon: parsed.data.icon,
        color: parsed.data.color,
        sort: parsed.data.sort ?? 0,
        ...categorySettingColumns(formData),
      });
    } catch {
      redirect("/admin/partners/categories?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "partner_category.create" });
  revalidatePath("/admin/partners/categories");
  revalidatePath("/partners");
  redirect("/admin/partners/categories?saved=1");
}

export async function updateCategory(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
    sort: formData.get("sort") || undefined,
  });
  if (!parsed.success) redirect("/admin/partners/categories?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerCategories)
        .set({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          icon: parsed.data.icon ?? null,
          color: parsed.data.color ?? null,
          sort: parsed.data.sort ?? 0,
          ...categorySettingColumns(formData),
          updatedAt: new Date(),
        })
        .where(eq(partnerCategories.id, id));
    } catch {
      redirect("/admin/partners/categories?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner_category.update",
    entityId: id,
  });
  revalidatePath("/admin/partners/categories");
  revalidatePath("/partners");
  redirect("/admin/partners/categories?saved=1");
}

/**
 * Delete a category. Refused while any partner is still in it: the FK would
 * quietly set those partners to "no category", and a stall that stops
 * showing its products because its category vanished is a bug report with
 * no obvious cause. Move them first.
 */
export async function deleteCategory(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  if (!z.uuid().safeParse(id).success) redirect("/admin/partners/categories");
  if (process.env.DATABASE_URL) {
    let inUse = 0;
    try {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(partners)
        .where(eq(partners.categoryId, id));
      inUse = row?.n ?? 0;
      if (inUse === 0) {
        await db.delete(partnerCategories).where(eq(partnerCategories.id, id));
      }
    } catch {
      redirect("/admin/partners/categories?error=1");
    }
    // Outside the try: redirect() signals by throwing, and the catch above
    // would turn it into a generic failure.
    if (inUse > 0) redirect("/admin/partners/categories?error=inuse");
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner_category.delete",
    entityId: id,
  });
  revalidatePath("/admin/partners/categories");
  revalidatePath("/partners");
  revalidatePath("/");
  redirect("/admin/partners/categories?deleted=1");
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------
/**
 * Approve a self-serve stall. Once live, later edits publish immediately —
 * `active` remains the kill switch if a partner goes off the rails.
 */
export async function approvePartner(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  let slug: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const [row] = await db
        .update(partners)
        .set({
          status: "approved",
          reviewedBy: session.user.id,
          reviewNote: null,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, id))
        .returning({ slug: partners.slug });
      slug = row?.slug ?? null;
    } catch {
      redirect("/admin/partners/queue?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.approve",
    entityType: "partner",
    entityId: id,
  });
  revalidatePath("/admin/partners/queue");
  revalidatePath("/admin/partners");
  revalidatePath("/partner-hub");
  revalidatePath(`/partner-hub/${id}`);
  revalidatePath("/partners");
  revalidatePath("/");
  if (slug) revalidatePath(`/partners/${slug}`);
  redirect("/admin/partners/queue?done=1");
}

/** Send a stall back for changes. The note is the owner's only feedback. */
export async function rejectPartner(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim();
  if (!note) redirect(`/admin/partners/queue?error=note`);

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({
          status: "rejected",
          reviewedBy: session.user.id,
          reviewNote: note,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, id));
    } catch {
      redirect("/admin/partners/queue?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.reject",
    entityType: "partner",
    entityId: id,
  });
  revalidatePath("/admin/partners/queue");
  revalidatePath("/admin/partners");
  revalidatePath("/partner-hub");
  revalidatePath(`/partner-hub/${id}`);
  redirect("/admin/partners/queue?done=1");
}

// ---------------------------------------------------------------------------
// Reviews moderation
// ---------------------------------------------------------------------------
export async function approveReview(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const featured = bool(formData, "featured");
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(reviews)
        .set({
          status: "approved",
          featured,
          reviewedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, id));
    } catch {
      redirect("/admin/reviews?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "review.approve",
    entityId: id,
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?done=1");
}

export async function rejectReview(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "");
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(reviews)
        .set({
          status: "rejected",
          featured: false,
          reviewedBy: session.user.id,
          reviewNote: note || null,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, id));
    } catch {
      redirect("/admin/reviews?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "review.reject",
    entityId: id,
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?done=1");
}

export async function toggleFeaturedReview(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const featured = String(formData.get("featured")) === "1";
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(reviews)
        .set({ featured, updatedAt: new Date() })
        .where(eq(reviews.id, id));
    } catch {
      redirect("/admin/reviews?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "review.feature",
    entityId: id,
    metadata: { featured },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?done=1");
}

// ---------------------------------------------------------------------------
// Quests
//
// A quest is a route around the venue: each objective points at a partner (or
// a free-form landmark), and adventurers check in when they get there.
// ---------------------------------------------------------------------------

const questSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give the quest a title of at least 2 characters.")
    .max(200, "Keep the title under 200 characters."),
  description: z.string().max(2000, "Keep this under 2000 characters.").optional(),
  // The message has to cover the field being absent as well as malformed: an
  // unset picker submits nothing at all, and the bare type error reads
  // "expected string, received undefined".
  eventId: z
    .string({ error: "Choose the event this quest belongs to." })
    .uuid("Choose the event this quest belongs to."),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export type QuestFormState = {
  error?: string;
  /** Keyed by field name, rendered on that input — see ObjectiveFormState. */
  fieldErrors?: Record<string, string>;
};

export async function createQuest(
  _prev: QuestFormState,
  formData: FormData
): Promise<QuestFormState> {
  const session = await requireAdmin();
  const parsed = questSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    eventId: formData.get("eventId") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  if (process.env.DATABASE_URL) {
    try {
      await db.insert(scavengerHunts).values({
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        eventId: parsed.data.eventId,
        sequential: formData.get("sequential") === "1",
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        active: false, // built in private, switched on once objectives exist
        createdBy: session.user.id,
      });
    } catch {
      return { error: "Could not create the quest. Please try again." };
    }
  }
  await logActivity({ actorId: session.user.id, action: "quest.create" });
  revalidatePath("/admin/quests");
  redirect(`/admin/quests/${slug}`);
}

export type QuestSettingsState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back on failure — see ObjectiveFormState.values. */
  values?: Record<string, string>;
};

/**
 * Save a quest's settings. Answers the submit rather than redirecting, so a
 * rejected value can be reported on the field that caused it — see
 * components/quest-settings-form.tsx.
 */
/**
 * Split a pasted allow list into normalised entries.
 *
 * Accepts commas, semicolons and newlines because all three are what comes
 * out of a spreadsheet, a chat message and a mail client's To: field, and an
 * admin should not have to know which one we wanted. Lower-cased and
 * de-duplicated so the stored list is exactly what the check compares
 * against — normalising on read instead would put the same rule in two
 * places, and they would drift.
 */
function parseAllowList(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\n,;]+/)) {
    const v = part.trim().toLowerCase();
    if (v) seen.add(v);
  }
  return [...seen];
}

/**
 * "10 = 1" per line into a sorted, de-duplicated ladder. Accepts =, :, → or a
 * dash between the two numbers, because that is what people type. Returns the
 * first line it could not read so the form can point at it.
 */
function parsePrizeTiers(
  raw: string
): { tiers: { points: number; entries: number }[] } | { bad: string } {
  const byPoints = new Map<number, number>();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^(\d+)\s*(?:=|:|→|->|-|–)\s*(\d+)$/);
    if (!m) return { bad: t };
    byPoints.set(Number(m[1]), Number(m[2]));
  }
  return {
    tiers: [...byPoints]
      .map(([points, entries]) => ({ points, entries }))
      .sort((a, b) => a.points - b.points),
  };
}

export async function updateQuest(
  _prev: QuestSettingsState,
  formData: FormData
): Promise<QuestSettingsState> {
  const session = await requireAdmin();
  const slug = String(formData.get("slug"));
  const parsed = questSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    eventId: formData.get("eventId") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
  });
  const allowListEnabled = formData.get("allowListEnabled") === "1";
  const allowList = parseAllowList(String(formData.get("allowList") ?? ""));
  const tiersRaw = String(formData.get("prizeTiers") ?? "");
  const tiers = parsePrizeTiers(tiersRaw);
  const easyModeHtml = sanitizeEasyModeHtml(
    String(formData.get("easyModeHtml") ?? "")
  );
  const values = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    easyModeHtml: String(formData.get("easyModeHtml") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    allowList: String(formData.get("allowList") ?? ""),
    prizeTiers: tiersRaw,
  };
  if ("bad" in tiers) {
    return {
      fieldErrors: {
        prizeTiers: `Couldn't read "${tiers.bad}" — write each rung as points = entries, like 10 = 1.`,
      },
      values,
    };
  }
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  }

  // A window that closes before it opens is two valid dates and one invalid
  // quest, so it can't be caught field by field.
  const opens = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const closes = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (opens && closes && closes.getTime() < opens.getTime()) {
    return {
      fieldErrors: { endsAt: "Closing time is before the opening time." },
      values,
    };
  }

  // Refused rather than saved, because the saved version of this mistake is a
  // quest nobody can start and no error anywhere to explain why. The form
  // warns as you type; this is the backstop for a submit that ignored it.
  if (allowListEnabled && allowList.length === 0) {
    return {
      fieldErrors: {
        allowList:
          "An allow list with nobody on it closes the quest to everyone. Add at least one, or switch the list off.",
      },
      values,
    };
  }

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(scavengerHunts)
        .set({
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          easyModeHtml,
          eventId: parsed.data.eventId,
          sequential: formData.get("sequential") === "1",
          allowListEnabled,
          // Kept even while the switch is off, so turning it back on restores
          // the list instead of asking for it again.
          allowList,
          prizeTiers: tiers.tiers,
          startsAt: opens,
          endsAt: closes,
          updatedAt: new Date(),
        })
        .where(eq(scavengerHunts.slug, slug));
    } catch {
      return {
        error: "Could not save those settings. Please try again.",
        values,
      };
    }
  }
  await logActivity({ actorId: session.user.id, action: "quest.update" });
  revalidatePath(`/admin/quests/${slug}`);
  revalidatePath("/admin/quests");
  revalidatePath(`/quests/${slug}`);
  return { ok: true };
}

const QUEST_EDITOR_TABS = new Set([
  "progress",
  "trail",
  "settings",
  "activity",
  "advanced",
]);

/** Stay on the section the organiser was in after a redirecting action. */
function questEditorPath(
  slug: string,
  query: Record<string, string>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    if (k === "tab" && !QUEST_EDITOR_TABS.has(v)) continue;
    params.set(k, v);
  }
  const q = params.toString();
  return q ? `/admin/quests/${slug}?${q}` : `/admin/quests/${slug}`;
}

export async function setQuestActive(formData: FormData) {
  const session = await requireAdmin();
  const slug = String(formData.get("slug"));
  const active = String(formData.get("active")) === "1";
  const tab = String(formData.get("tab") ?? "");
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(scavengerHunts)
        .set({ active, updatedAt: new Date() })
        .where(eq(scavengerHunts.slug, slug));
    } catch {
      redirect(questEditorPath(slug, { tab, error: "1" }));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.active",
    metadata: { slug, active },
  });
  revalidatePath(`/admin/quests/${slug}`);
  revalidatePath("/quests");
  redirect(questEditorPath(slug, { tab, saved: "1" }));
}

export async function deleteQuest(formData: FormData) {
  const session = await requireAdmin();
  const slug = String(formData.get("slug"));
  if (process.env.DATABASE_URL) {
    try {
      await db.delete(scavengerHunts).where(eq(scavengerHunts.slug, slug));
    } catch {
      redirect(`/admin/quests/${slug}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.delete",
    metadata: { slug },
  });
  revalidatePath("/admin/quests");
  redirect("/admin/quests?deleted=1");
}

/**
 * Messages are written for the person filling the form, not for a log. They
 * surface on the field itself in the objective dialog, so they have to say what
 * to do about it — zod's defaults ("Too small: expected string to have >=2
 * characters") do not.
 */
const objectiveSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give it a title of at least 2 characters.")
    .max(200, "Keep the title under 200 characters."),
  prompt: z.string().max(2000, "Keep this under 2000 characters.").optional(),
  points: z.coerce
    .number({ error: "Points must be a number." })
    .int("Points must be a whole number.")
    .min(0, "Points can't be negative.")
    .max(1000, "1000 points is the most one objective can be worth.")
    .default(10),
  type: z.enum([
    "qr_scan",
    "riddle",
    "crossword",
    "cipher",
    "geo_checkpoint",
    "photo_proof",
    "trivia_gate",
    "unlock_code",
  ]),
  revealMode: z.enum(["direct", "clue"]).default("direct"),
  hidden: z.boolean().default(false),
  claimMode: z
    .enum(["live_code", "sealed_tag", "location_verified", "open"])
    .default("live_code"),
  partnerId: z.string().uuid("Pick a partner from the list.").optional(),
  locationHint: z
    .string()
    .max(200, "Keep the location hint under 200 characters.")
    .optional(),
  parentId: z.string().uuid("Pick an objective from the list.").optional(),
  claimRadiusM: z.coerce
    .number({ error: "Radius must be a number." })
    .int("Radius must be a whole number of metres.")
    .min(10, "10 metres is the smallest usable radius.")
    .max(50000, "50000 metres is the largest allowed radius.")
    .optional(),
  answer: z.string().max(200, "Keep the answer under 200 characters.").optional(),
});

export type ObjectiveFormState = {
  /** Set on a successful save — the dialog closes itself on this. */
  ok?: boolean;
  /** Something that isn't about one field: a failed write, a missing quest. */
  error?: string;
  /** Keyed by form field name, rendered under that input. */
  fieldErrors?: Record<string, string>;
  /**
   * What was submitted, echoed back so a rejected save can re-fill the form.
   *
   * React resets an uncontrolled form once its action settles, so without this
   * a validation failure hands back an empty (or stale) dialog — losing the
   * work and telling the reader to fix a field that no longer shows what they
   * typed. Only sent on failure; a success closes the dialog anyway.
   */
  values?: Record<string, string>;
};

/** The text the reader typed, for echoing back on a rejected save. */
function submittedValues(formData: FormData): Record<string, string> {
  const keys = [
    "title",
    "prompt",
    "answer",
    "locationHint",
    "points",
    "claimRadiusM",
  ];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    if (typeof v === "string") out[k] = v;
  }
  formData.getAll("choices").forEach((c, i) => {
    out[`choices.${i}`] = String(c);
  });
  return out;
}

/** First message per field — one per input is all there is room to show. */
function fieldErrorsFrom(issues: z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * The checks zod can't express, because they depend on the objective's type.
 * These used to be enforced only by the `required` attribute on the rendered
 * input, which is a courtesy to save a round trip — never the enforcement.
 */
function objectiveTypeErrors(
  data: z.infer<typeof objectiveSchema>,
  formData: FormData
): Record<string, string> {
  const out: Record<string, string> = {};
  const needsAnswer = ["riddle", "cipher", "crossword", "unlock_code"];
  if (needsAnswer.includes(data.type) && !data.answer?.trim()) {
    out.answer =
      data.type === "unlock_code"
        ? "Set the password they have to type in."
        : "Set the answer this is checked against.";
  }
  if (data.parentId && data.parentId === formData.get("id")) {
    out.parentId = "An objective can't wait for itself.";
  }
  if (data.type === "trivia_gate") {
    const choices = formData
      .getAll("choices")
      .map(String)
      .map((c) => c.trim())
      .filter(Boolean);
    if (choices.length < 2) {
      out.choices = "Give the correct answer and at least one decoy.";
    }
  }
  return out;
}

function objectiveFields(formData: FormData) {
  return {
    title: formData.get("title"),
    prompt: formData.get("prompt") || undefined,
    points: formData.get("points") || 10,
    type: formData.get("type") || "qr_scan",
    revealMode: formData.get("revealMode") || "direct",
    hidden: formData.get("hidden") === "1",
    claimMode: formData.get("claimMode") || "live_code",
    partnerId: formData.get("partnerId") || undefined,
    locationHint: formData.get("locationHint") || undefined,
    parentId: formData.get("parentId") || undefined,
    claimRadiusM: formData.get("claimRadiusM") || undefined,
    answer: formData.get("answer") || undefined,
  };
}

/** Answers live in `config`, server-side — they never reach a player's browser. */
function configFor(
  type: string,
  answer: string | undefined,
  formData: FormData
): Record<string, unknown> {
  switch (type) {
    case "riddle":
    case "crossword":
    case "cipher":
      return { answer: answer ?? "" };
    case "unlock_code":
      return { code: answer ?? "" };
    case "trivia_gate": {
      const choices = formData
        .getAll("choices")
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean);
      return { choices, correct: Number(formData.get("correct") ?? 0) };
    }
    case "photo_proof":
      return { auto_approve: true };
    default:
      return {};
  }
}

/**
 * Add an objective to a quest.
 *
 * Returns its outcome rather than redirecting. It used to `redirect(...?error=1)`
 * on any failure, which navigated the page — unmounting the dialog the form
 * lives in, throwing away everything typed, and leaving a page-level
 * "Could not save — check the fields" behind with no indication of which field
 * or why. Now the dialog stays put and each message lands on its own input.
 */
export async function addObjective(
  _prev: ObjectiveFormState,
  formData: FormData
): Promise<ObjectiveFormState> {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const parsed = objectiveSchema.safeParse(objectiveFields(formData));
  const values = submittedValues(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  }
  const typeErrors = objectiveTypeErrors(parsed.data, formData);
  if (Object.keys(typeErrors).length > 0) {
    return { fieldErrors: typeErrors, values };
  }

  if (process.env.DATABASE_URL) {
    try {
      const [quest] = await db
        .select({ id: scavengerHunts.id })
        .from(scavengerHunts)
        .where(eq(scavengerHunts.slug, questSlug))
        .limit(1);
      if (!quest) {
        return { error: "That quest no longer exists.", values };
      }

      // Where in the trail this one lands. The timeline offers a "+" between
      // every pair of objectives, so an insert can arrive for any position —
      // absent or out of range means append, which is what the plain
      // "Add objective" button sends.
      const rawAt = formData.get("atIndex");
      const atIndex = rawAt === null || rawAt === "" ? null : Number(rawAt);

      const existing = await db
        .select({ sort: huntSteps.sort })
        .from(huntSteps)
        .where(eq(huntSteps.huntId, quest.id))
        .orderBy(asc(huntSteps.sort));

      let insertSort: number;
      if (
        atIndex === null ||
        Number.isNaN(atIndex) ||
        atIndex >= existing.length
      ) {
        insertSort = (existing[existing.length - 1]?.sort ?? -1) + 1;
      } else {
        const at = Math.max(0, atIndex);
        insertSort = existing[at].sort;
        // Push everything from that position down one. There is no unique
        // constraint on (hunt_id, sort), so the momentary collision between
        // this shift and the insert below is harmless.
        await db
          .update(huntSteps)
          .set({ sort: sql`${huntSteps.sort} + 1` })
          .where(
            and(eq(huntSteps.huntId, quest.id), gte(huntSteps.sort, insertSort))
          );
      }

      const [created] = await db
        .insert(huntSteps)
        .values({
          huntId: quest.id,
          sort: insertSort,
          type: parsed.data.type,
          title: parsed.data.title,
          prompt: parsed.data.prompt,
          points: parsed.data.points,
          partnerId: parsed.data.partnerId,
          locationHint: parsed.data.locationHint,
          parentId: parsed.data.parentId,
          revealMode: parsed.data.revealMode,
          hidden: parsed.data.hidden,
          claimMode: parsed.data.claimMode,
          claimRadiusM: parsed.data.claimRadiusM,
          config: configFor(parsed.data.type, parsed.data.answer, formData),
        })
        .returning({ id: huntSteps.id });

      // Mint the station key up front so the vendor page works the moment
      // someone opens it — no setup step left to forget on the day.
      if (created && parsed.data.claimMode === "live_code") {
        await ensureStation(created.id);
      }
    } catch {
      return {
        error: "Could not save that objective. Please try again.",
        values,
      };
    }
  }
  await logActivity({ actorId: session.user.id, action: "quest.objective.add" });
  revalidatePath(`/admin/quests/${questSlug}`);
  revalidatePath(`/quests/${questSlug}`);
  return { ok: true };
}

export async function updateObjective(
  _prev: ObjectiveFormState,
  formData: FormData
): Promise<ObjectiveFormState> {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const id = String(formData.get("id"));
  const parsed = objectiveSchema.safeParse(objectiveFields(formData));
  const values = submittedValues(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  }
  const typeErrors = objectiveTypeErrors(parsed.data, formData);
  if (Object.keys(typeErrors).length > 0) {
    return { fieldErrors: typeErrors, values };
  }

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(huntSteps)
        .set({
          type: parsed.data.type,
          title: parsed.data.title,
          prompt: parsed.data.prompt ?? null,
          points: parsed.data.points,
          partnerId: parsed.data.partnerId ?? null,
          locationHint: parsed.data.locationHint ?? null,
          parentId: parsed.data.parentId ?? null,
          revealMode: parsed.data.revealMode,
          hidden: parsed.data.hidden,
          claimMode: parsed.data.claimMode,
          claimRadiusM: parsed.data.claimRadiusM ?? null,
          config: configFor(parsed.data.type, parsed.data.answer, formData),
          updatedAt: new Date(),
        })
        .where(eq(huntSteps.id, id));
      if (parsed.data.claimMode === "live_code") await ensureStation(id);
    } catch {
      return {
        error: "Could not save that objective. Please try again.",
        values,
      };
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.objective.update",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  revalidatePath(`/quests/${questSlug}`);
  return { ok: true };
}

export async function deleteObjective(formData: FormData) {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const id = String(formData.get("id"));
  if (process.env.DATABASE_URL) {
    try {
      await db.delete(huntSteps).where(eq(huntSteps.id, id));
    } catch {
      redirect(questEditorPath(questSlug, { tab: "trail", error: "1" }));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.objective.delete",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  revalidatePath(`/quests/${questSlug}`);
  redirect(questEditorPath(questSlug, { tab: "trail", saved: "1" }));
}

/**
 * Swap an objective with its neighbour. Order is presentation only — the quest
 * is free-order, so this controls how the trail reads, not what's unlocked.
 */
export async function moveObjective(formData: FormData) {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const id = String(formData.get("id"));
  const up = String(formData.get("dir")) === "up";

  if (process.env.DATABASE_URL) {
    try {
      const [self] = await db
        .select({
          id: huntSteps.id,
          sort: huntSteps.sort,
          huntId: huntSteps.huntId,
        })
        .from(huntSteps)
        .where(eq(huntSteps.id, id))
        .limit(1);
      if (self) {
        const [neighbour] = await db
          .select({ id: huntSteps.id, sort: huntSteps.sort })
          .from(huntSteps)
          .where(
            and(
              eq(huntSteps.huntId, self.huntId),
              up ? lt(huntSteps.sort, self.sort) : gt(huntSteps.sort, self.sort)
            )
          )
          .orderBy(up ? desc(huntSteps.sort) : asc(huntSteps.sort))
          .limit(1);
        if (neighbour) {
          await db
            .update(huntSteps)
            .set({ sort: neighbour.sort })
            .where(eq(huntSteps.id, self.id));
          await db
            .update(huntSteps)
            .set({ sort: self.sort })
            .where(eq(huntSteps.id, neighbour.id));
        }
      }
    } catch {
      redirect(questEditorPath(questSlug, { tab: "trail", error: "1" }));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.objective.move",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  redirect(questEditorPath(questSlug, { tab: "trail", saved: "1" }));
}

/** Issue a fresh station key — for a lost device or a stand changing hands. */
export async function rotateStationKey(formData: FormData) {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const id = String(formData.get("id"));
  if (process.env.DATABASE_URL) {
    try {
      await db.delete(huntStations).where(eq(huntStations.stepId, id));
      await ensureStation(id);
    } catch {
      redirect(questEditorPath(questSlug, { tab: "trail", error: "1" }));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.station.rotate",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  redirect(questEditorPath(questSlug, { tab: "trail", saved: "1" }));
}

// ---------------------------------------------------------------------------
// Quest table — inline cell edits and bulk actions
//
// The admin quest list is a `DataTable`, which writes one (id, field, value)
// triple at a time and expects a result rather than a redirect. Mirrors the
// event table's contract in actions-events.ts.
// ---------------------------------------------------------------------------

async function adminOrNull() {
  const session = await auth();
  if (!session?.user || !roleAtLeast(session.user.role, "admin")) return null;
  return session;
}

export type QuestSaveResult = { ok: true } | { ok: false; error: string };

const optionalQuestStamp = () =>
  z
    .string()
    .transform((v) => (v.trim() === "" ? null : new Date(v)))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), {
      message: "Not a valid date",
    });

/** Only these columns are writable from the table; everything else is a no. */
const QUEST_FIELDS = {
  title: z.string().trim().min(2, "Needs at least 2 characters").max(200),
  description: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || v.length <= 2000, { message: "Too long" }),
  active: z.string().transform((v) => v === "1"),
  eventId: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || z.uuid().safeParse(v).success, {
      message: "Not a valid event",
    }),
  startsAt: optionalQuestStamp(),
  endsAt: optionalQuestStamp(),
} as const;

type QuestField = keyof typeof QUEST_FIELDS;

export async function updateQuestField(
  id: string,
  field: string,
  value: string
): Promise<QuestSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown quest." };

  if (!Object.prototype.hasOwnProperty.call(QUEST_FIELDS, field)) {
    return { ok: false, error: "That field can't be edited here." };
  }
  const key = field as QuestField;
  const parsed = QUEST_FIELDS[key].safeParse(value);
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
      .from(scavengerHunts)
      .where(eq(scavengerHunts.id, id))
      .limit(1);
    if (!current) return { ok: false, error: "Unknown quest." };

    // The window has to stay a window, whichever end is being moved.
    if (key === "startsAt" || key === "endsAt") {
      const starts = key === "startsAt" ? (next as Date | null) : current.startsAt;
      const ends = key === "endsAt" ? (next as Date | null) : current.endsAt;
      if (starts && ends && ends.getTime() < starts.getTime()) {
        return { ok: false, error: "The end has to come after the start." };
      }
    }

    // A quest's venue checks measure from its event's coordinates, so pointing
    // at an event that has since gone is worse than pointing at none.
    if (key === "eventId" && next !== null) {
      const [e] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, next as string))
        .limit(1);
      if (!e) return { ok: false, error: "That event no longer exists." };
    }

    await db
      .update(scavengerHunts)
      .set({ [key]: next, updatedAt: new Date() })
      .where(eq(scavengerHunts.id, id));
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  await logActivity({
    actorId: session.user.id,
    action: "quest.field_update",
    entityType: "quest",
    entityId: id,
    metadata: { field: key },
  });

  revalidatePath("/admin/quests");
  revalidatePath("/quests");
  return { ok: true };
}

/** Take a batch of quests live or offline — the table's bulk action. */
export async function setQuestsActive(
  ids: string[],
  active: boolean
): Promise<QuestSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };

  const clean = ids.filter((id) => z.uuid().safeParse(id).success);
  if (clean.length === 0) return { ok: false, error: "Nothing selected." };

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(scavengerHunts)
        .set({ active, updatedAt: new Date() })
        .where(inArray(scavengerHunts.id, clean));
    } catch {
      return { ok: false, error: "Could not update those quests." };
    }
  }

  await logActivity({
    actorId: session.user.id,
    action: "quest.bulk_active",
    metadata: { count: clean.length, active },
  });

  revalidatePath("/admin/quests");
  revalidatePath("/quests");
  return { ok: true };
}
