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
  reviews,
  users,
  galleryItems,
  eventGalleryItems,
  scavengerHunts,
  huntSteps,
  huntStations,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { ensureStation } from "@/lib/hunts";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { logActivity } from "@/lib/logging";
import { announceEvent } from "@/lib/discord";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "admin")) redirect("/dashboard");
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
  externalUrl: z.string().url().max(500).optional(),
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
        await db
          .update(users)
          .set({ role: "partner" })
          .where(eq(users.id, app.userId));
        const storeName = app.businessName || "New stall";
        await db
          .insert(partners)
          .values({
            userId: app.userId,
            categoryId: app.categoryId,
            slug: `${slugify(storeName)}-${Date.now().toString(36)}`,
            businessName: storeName,
            tagline: app.pitch.slice(0, 140),
          })
          .onConflictDoNothing();
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
  redirect("/admin/partners/applications?done=1");
}

export async function rejectApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "");

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

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------
const partnerSchema = z.object({
  businessName: z.string().min(2).max(160),
  categoryId: z.string().uuid().optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  socials: z.string().max(2000).optional(),
});

export async function createPartner(formData: FormData) {
  const session = await requireAdmin();
  const parsed = partnerSchema.safeParse({
    businessName: formData.get("businessName"),
    categoryId: formData.get("categoryId") || undefined,
    tagline: formData.get("tagline") || undefined,
    bio: formData.get("bio") || undefined,
    socials: formData.get("socials") || undefined,
  });
  if (!parsed.success) redirect("/admin/partners/new?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(partners).values({
        slug: `${slugify(parsed.data.businessName)}-${Date.now().toString(36)}`,
        businessName: parsed.data.businessName,
        categoryId: parsed.data.categoryId ?? null,
        tagline: parsed.data.tagline,
        bio: parsed.data.bio,
        isPremium: bool(formData, "isPremium"),
        active: true,
        socials: parsed.data.socials ? { raw: parsed.data.socials } : null,
      });
    } catch {
      redirect("/admin/partners/new?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "partner.create" });
  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  redirect("/admin/partners?saved=1");
}

export async function updatePartner(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = partnerSchema.safeParse({
    businessName: formData.get("businessName"),
    categoryId: formData.get("categoryId") || undefined,
    tagline: formData.get("tagline") || undefined,
    bio: formData.get("bio") || undefined,
    socials: formData.get("socials") || undefined,
  });
  if (!parsed.success) redirect(`/admin/partners/${id}?error=1`);

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({
          businessName: parsed.data.businessName,
          categoryId: parsed.data.categoryId ?? null,
          tagline: parsed.data.tagline ?? null,
          bio: parsed.data.bio ?? null,
          isPremium: bool(formData, "isPremium"),
          active: bool(formData, "active"),
          socials: parsed.data.socials ? { raw: parsed.data.socials } : null,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, id));
    } catch {
      redirect(`/admin/partners/${id}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.update",
    entityId: id,
  });
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${id}`);
  revalidatePath("/partners");
  redirect("/admin/partners?saved=1");
}

export async function setPartnerPremium(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const premium = String(formData.get("premium")) === "1";
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({ isPremium: premium, updatedAt: new Date() })
        .where(eq(partners.id, id));
    } catch {
      redirect("/admin/partners?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.premium",
    entityId: id,
    metadata: { premium },
  });
  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  redirect("/admin/partners?saved=1");
}

export async function setPartnerActive(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "1";
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({ active, updatedAt: new Date() })
        .where(eq(partners.id, id));
    } catch {
      redirect("/admin/partners?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.active",
    entityId: id,
    metadata: { active },
  });
  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  redirect("/admin/partners?saved=1");
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
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  eventId: z.string().uuid().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export type QuestFormState = { error?: string };

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
  if (!parsed.success) return { error: "Give the quest a title (2+ characters)." };

  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  if (process.env.DATABASE_URL) {
    try {
      await db.insert(scavengerHunts).values({
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        eventId: parsed.data.eventId,
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

export async function updateQuest(formData: FormData) {
  const session = await requireAdmin();
  const slug = String(formData.get("slug"));
  const parsed = questSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    eventId: formData.get("eventId") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
  });
  if (!parsed.success) redirect(`/admin/quests/${slug}?error=1`);

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(scavengerHunts)
        .set({
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          eventId: parsed.data.eventId ?? null,
          startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(scavengerHunts.slug, slug));
    } catch {
      redirect(`/admin/quests/${slug}?error=1`);
    }
  }
  await logActivity({ actorId: session.user.id, action: "quest.update" });
  revalidatePath(`/admin/quests/${slug}`);
  revalidatePath(`/quests/${slug}`);
  redirect(`/admin/quests/${slug}?saved=1`);
}

/** The live switch. Flipping this is how a quest opens and closes on the day. */
export async function setQuestActive(formData: FormData) {
  const session = await requireAdmin();
  const slug = String(formData.get("slug"));
  const active = String(formData.get("active")) === "1";
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(scavengerHunts)
        .set({ active, updatedAt: new Date() })
        .where(eq(scavengerHunts.slug, slug));
    } catch {
      redirect(`/admin/quests/${slug}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.active",
    metadata: { slug, active },
  });
  revalidatePath(`/admin/quests/${slug}`);
  revalidatePath("/quests");
  redirect(`/admin/quests/${slug}?saved=1`);
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

const objectiveSchema = z.object({
  title: z.string().min(2).max(200),
  prompt: z.string().max(2000).optional(),
  points: z.coerce.number().int().min(0).max(1000).default(10),
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
  claimMode: z.enum(["live_code", "sealed_tag", "open_tag"]).default("live_code"),
  partnerId: z.string().uuid().optional(),
  locationHint: z.string().max(200).optional(),
  claimRadiusM: z.coerce.number().int().min(10).max(50000).optional(),
  answer: z.string().max(200).optional(),
});

function objectiveFields(formData: FormData) {
  return {
    title: formData.get("title"),
    prompt: formData.get("prompt") || undefined,
    points: formData.get("points") || 10,
    type: formData.get("type") || "qr_scan",
    revealMode: formData.get("revealMode") || "direct",
    claimMode: formData.get("claimMode") || "live_code",
    partnerId: formData.get("partnerId") || undefined,
    locationHint: formData.get("locationHint") || undefined,
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

export async function addObjective(formData: FormData) {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const parsed = objectiveSchema.safeParse(objectiveFields(formData));
  if (!parsed.success) redirect(`/admin/quests/${questSlug}?error=1`);

  if (process.env.DATABASE_URL) {
    try {
      const [quest] = await db
        .select({ id: scavengerHunts.id })
        .from(scavengerHunts)
        .where(eq(scavengerHunts.slug, questSlug))
        .limit(1);
      if (!quest) redirect("/admin/quests?error=1");

      const [last] = await db
        .select({ sort: huntSteps.sort })
        .from(huntSteps)
        .where(eq(huntSteps.huntId, quest.id))
        .orderBy(desc(huntSteps.sort))
        .limit(1);

      const [created] = await db
        .insert(huntSteps)
        .values({
          huntId: quest.id,
          sort: (last?.sort ?? -1) + 1,
          type: parsed.data.type,
          title: parsed.data.title,
          prompt: parsed.data.prompt,
          points: parsed.data.points,
          partnerId: parsed.data.partnerId,
          locationHint: parsed.data.locationHint,
          revealMode: parsed.data.revealMode,
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
      redirect(`/admin/quests/${questSlug}?error=1`);
    }
  }
  await logActivity({ actorId: session.user.id, action: "quest.objective.add" });
  revalidatePath(`/admin/quests/${questSlug}`);
  revalidatePath(`/quests/${questSlug}`);
  redirect(`/admin/quests/${questSlug}?saved=1`);
}

export async function updateObjective(formData: FormData) {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const id = String(formData.get("id"));
  const parsed = objectiveSchema.safeParse(objectiveFields(formData));
  if (!parsed.success) redirect(`/admin/quests/${questSlug}?error=1`);

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
          revealMode: parsed.data.revealMode,
          claimMode: parsed.data.claimMode,
          claimRadiusM: parsed.data.claimRadiusM ?? null,
          config: configFor(parsed.data.type, parsed.data.answer, formData),
          updatedAt: new Date(),
        })
        .where(eq(huntSteps.id, id));
      if (parsed.data.claimMode === "live_code") await ensureStation(id);
    } catch {
      redirect(`/admin/quests/${questSlug}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.objective.update",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  revalidatePath(`/quests/${questSlug}`);
  redirect(`/admin/quests/${questSlug}?saved=1`);
}

export async function deleteObjective(formData: FormData) {
  const session = await requireAdmin();
  const questSlug = String(formData.get("questSlug"));
  const id = String(formData.get("id"));
  if (process.env.DATABASE_URL) {
    try {
      await db.delete(huntSteps).where(eq(huntSteps.id, id));
    } catch {
      redirect(`/admin/quests/${questSlug}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.objective.delete",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  revalidatePath(`/quests/${questSlug}`);
  redirect(`/admin/quests/${questSlug}?saved=1`);
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
      redirect(`/admin/quests/${questSlug}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.objective.move",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  redirect(`/admin/quests/${questSlug}?saved=1`);
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
      redirect(`/admin/quests/${questSlug}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "quest.station.rotate",
    entityId: id,
  });
  revalidatePath(`/admin/quests/${questSlug}`);
  redirect(`/admin/quests/${questSlug}?saved=1`);
}
