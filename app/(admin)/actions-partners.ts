"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  partners,
  partnerCategories,
  partnerGalleryItems,
  partnerInvites,
  partnerMembers,
  partnerOfferings,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { logActivity } from "@/lib/logging";
import { slugify } from "@/lib/slug";
import { isStoredMediaUrl } from "@/lib/media";
import { safeHttpUrl } from "@/lib/url";
import { parseSocials, toStoredSocials } from "@/lib/socials";
import {
  countOwners,
  findUserByEmail,
  hasLiveInviteFor,
  inviteExpiry,
  inviteUrl,
  isAlreadyMember,
  newInviteToken,
} from "@/lib/partner-invites";
import { sendPartnerInvite } from "@/lib/mail";

/**
 * Admin-side management of a partner (a vendor, a stallholder).
 *
 * The partner hub has its own actions for most of this, scoped to whoever is
 * a member of the stall. These are the admin's versions: gated on the admin
 * role rather than membership, and returning to the admin page rather than
 * the hub. Kept separate so a change to what a stallholder may do to their
 * own page never quietly widens or narrows what an admin can do to any page.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "admin")) redirect("/");
  return session;
}

async function adminOrNull() {
  const session = await auth();
  if (!session?.user || !roleAtLeast(session.user.role, "admin")) return null;
  return session;
}

const PARTNER_STATUSES = ["draft", "pending", "approved", "rejected"] as const;

/** Every surface a partner appears on. */
function revalidatePartner(id: string, slug: string | null) {
  revalidatePath("/");
  revalidatePath("/partners");
  if (slug) revalidatePath(`/partners/${slug}`);
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${id}`);
  revalidatePath("/partner-hub");
  revalidatePath(`/partner-hub/${id}`);
}

const backTo = (id: string, tab: string, flag: string) =>
  `/admin/partners/${id}?tab=${tab}&${flag}=1`;

/**
 * An uploaded image URL, or null. The uploader hands the URL back through the
 * form, so it is client-controlled: only a URL in our own Blob store counts.
 */
function storedImage(value: FormDataEntryValue | undefined): string | null {
  const url = String(value ?? "");
  return isStoredMediaUrl(url) ? url : null;
}

const optionalText = (max: number) =>
  z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || v.length <= max, {
      message: `At most ${max} characters`,
    });

const optionalLink = () =>
  z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || safeHttpUrl(v) !== null, {
      message: "Must be an http(s) link",
    });

// ---------------------------------------------------------------------------
// The table — one cell at a time
// ---------------------------------------------------------------------------

/**
 * Every column the table may write, and what counts as valid. A whitelist,
 * for the same reason as the events table: this is reachable by POST from
 * anywhere an admin session exists.
 */
const PARTNER_FIELDS = {
  businessName: z.string().trim().min(2, "Needs at least 2 characters").max(160),
  slug: z
    .string()
    .trim()
    .min(2, "Between 2 and 120 characters")
    .max(120)
    .refine((v) => /^[a-z0-9-]+$/.test(v), {
      message: "Lowercase letters, numbers and hyphens only",
    }),
  tagline: optionalText(200),
  bio: optionalText(2000),
  shopUrl: optionalLink(),
  status: z.enum(PARTNER_STATUSES),
  reviewNote: optionalText(500),
  categoryId: z
    .string()
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || z.uuid().safeParse(v).success, {
      message: "Not a valid category",
    }),
  isPremium: z.string().transform((v) => v === "1"),
  active: z.string().transform((v) => v === "1"),
} as const;

type PartnerField = keyof typeof PARTNER_FIELDS;

export type PartnerSaveResult = { ok: true } | { ok: false; error: string };

export async function updatePartnerField(
  id: string,
  field: string,
  value: string
): Promise<PartnerSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown partner." };
  if (!Object.prototype.hasOwnProperty.call(PARTNER_FIELDS, field)) {
    return { ok: false, error: "That field can't be edited here." };
  }
  const key = field as PartnerField;
  const parsed = PARTNER_FIELDS[key].safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid value." };
  }
  const next = parsed.data;
  if (!process.env.DATABASE_URL) return { ok: false, error: "No database configured." };

  let slug: string | null = null;
  try {
    const [current] = await db
      .select({ slug: partners.slug })
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    if (!current) return { ok: false, error: "Unknown partner." };
    slug = current.slug;

    if (key === "slug") {
      const [clash] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, next as string))
        .limit(1);
      if (clash && clash.id !== id) {
        return { ok: false, error: "Another partner already uses that slug." };
      }
    }
    if (key === "categoryId" && next !== null) {
      const [c] = await db
        .select({ id: partnerCategories.id })
        .from(partnerCategories)
        .where(eq(partnerCategories.id, next as string))
        .limit(1);
      if (!c) return { ok: false, error: "That category no longer exists." };
    }

    await db
      .update(partners)
      .set({
        [key]: next,
        // Approving from the table is still a review.
        ...(key === "status" ? { reviewedBy: session.user.id } : {}),
        updatedAt: new Date(),
      })
      .where(eq(partners.id, id));
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  await logActivity({
    actorId: session.user.id,
    action: "partner.field_update",
    entityType: "partner",
    entityId: id,
    metadata: { field: key },
  });
  revalidatePartner(id, key === "slug" ? (next as string) : slug);
  return { ok: true };
}

/** Bulk switch — the table's selection actions. */
export async function setPartnersActive(
  ids: string[],
  active: boolean
): Promise<PartnerSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };
  const clean = ids.filter((id) => z.uuid().safeParse(id).success);
  if (clean.length === 0) return { ok: false, error: "Nothing selected." };
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({ active, updatedAt: new Date() })
        .where(inArray(partners.id, clean));
    } catch {
      return { ok: false, error: "Could not save. Please try again." };
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.bulk_active",
    entityType: "partner",
    metadata: { count: clean.length, active },
  });
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function setPartnersStatus(
  ids: string[],
  status: string
): Promise<PartnerSaveResult> {
  const session = await adminOrNull();
  if (!session) return { ok: false, error: "Not authorised." };
  const parsedStatus = z.enum(PARTNER_STATUSES).safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: "Unknown status." };
  const clean = ids.filter((id) => z.uuid().safeParse(id).success);
  if (clean.length === 0) return { ok: false, error: "Nothing selected." };
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({
          status: parsedStatus.data,
          reviewedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(inArray(partners.id, clean));
    } catch {
      return { ok: false, error: "Could not save. Please try again." };
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.bulk_status",
    entityType: "partner",
    metadata: { count: clean.length, status: parsedStatus.data },
  });
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/admin/partners");
  revalidatePath("/admin/partners/queue");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const createSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  categoryId: z.uuid().optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  shopUrl: optionalLink(),
  socials: z.string().max(2000).optional(),
  ownerEmail: z.email().max(320).optional(),
});

/**
 * Add a partner by hand.
 *
 * Created approved and live: an admin doing this IS the review. The owner is
 * optional — a stall we list on their behalf may have nobody managing it
 * yet. Given an email, an existing account becomes owner immediately;
 * otherwise an owner invite is minted for that address, and the link is
 * shown on the Team tab for hand-delivery, since mail may not be wired up.
 */
export async function createPartner(formData: FormData) {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    businessName: formData.get("businessName"),
    categoryId: formData.get("categoryId") || undefined,
    tagline: formData.get("tagline") || undefined,
    bio: formData.get("bio") || undefined,
    shopUrl: formData.get("shopUrl") ?? "",
    socials: formData.get("socials") || undefined,
    ownerEmail:
      String(formData.get("ownerEmail") ?? "").trim().toLowerCase() || undefined,
  });
  if (!parsed.success) redirect("/admin/partners/new?error=1");

  const logo = storedImage(formData.getAll("logo")[0]);
  const banner = storedImage(formData.getAll("banner")[0]);
  const active = formData.get("active") !== "0";
  const isPremium = formData.get("isPremium") != null;

  let createdId: string | null = null;
  let inviteToken: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const [row] = await db
        .insert(partners)
        .values({
          slug: `${slugify(parsed.data.businessName)}-${Date.now().toString(36)}`,
          businessName: parsed.data.businessName,
          categoryId: parsed.data.categoryId ?? null,
          tagline: parsed.data.tagline ?? null,
          bio: parsed.data.bio ?? null,
          shopUrl: parsed.data.shopUrl,
          logoUrl: logo,
          bannerUrl: banner,
          isPremium,
          active,
          status: "approved",
          reviewedBy: session.user.id,
          socials: toStoredSocials(parseSocials({ raw: parsed.data.socials })),
        })
        .returning({ id: partners.id });
      createdId = row?.id ?? null;
    } catch {
      redirect("/admin/partners/new?error=1");
    }
    if (!createdId) redirect("/admin/partners/new?error=1");

    const email = parsed.data.ownerEmail;
    if (email) {
      const existing = await findUserByEmail(email);
      if (existing) {
        await db
          .insert(partnerMembers)
          .values({
            partnerId: createdId,
            userId: existing.id,
            role: "owner",
            invitedBy: session.user.id,
          })
          .onConflictDoNothing();
        // A member who now runs a stall is a partner — the role is what
        // opens the hub to them.
        await db
          .update(users)
          .set({ role: "partner" })
          .where(and(eq(users.id, existing.id), eq(users.role, "member")));
      } else {
        const { raw, hash } = newInviteToken();
        const expiresAt = inviteExpiry();
        await db.insert(partnerInvites).values({
          partnerId: createdId,
          email,
          role: "owner",
          tokenHash: hash,
          invitedBy: session.user.id,
          expiresAt,
        });
        await sendPartnerInvite({
          to: email,
          partnerName: parsed.data.businessName,
          inviterName: session.user.name ?? "Mythical Mecca",
          url: inviteUrl(raw),
          expiresAt,
        });
        inviteToken = raw;
      }
    }
  }

  await logActivity({
    actorId: session.user.id,
    action: "partner.create",
    entityType: "partner",
    entityId: createdId ?? undefined,
  });
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/admin/partners");
  if (!createdId) redirect("/admin/partners?saved=1");
  if (inviteToken) {
    redirect(
      `/admin/partners/${createdId}?tab=team&invited=${encodeURIComponent(inviteToken)}`
    );
  }
  redirect(`/admin/partners/${createdId}?tab=details&created=1`);
}

// ---------------------------------------------------------------------------
// Details form
// ---------------------------------------------------------------------------

const detailsSchema = z.object({
  businessName: PARTNER_FIELDS.businessName,
  slug: PARTNER_FIELDS.slug,
  categoryId: PARTNER_FIELDS.categoryId,
  tagline: PARTNER_FIELDS.tagline,
  bio: PARTNER_FIELDS.bio,
  shopUrl: PARTNER_FIELDS.shopUrl,
  status: PARTNER_FIELDS.status,
  reviewNote: PARTNER_FIELDS.reviewNote,
  socials: z.string().max(2000),
});

export async function updatePartnerDetails(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  if (!z.uuid().safeParse(id).success) redirect("/admin/partners");

  const parsed = detailsSchema.safeParse({
    businessName: formData.get("businessName") ?? "",
    slug: formData.get("slug") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    tagline: formData.get("tagline") ?? "",
    bio: formData.get("bio") ?? "",
    shopUrl: formData.get("shopUrl") ?? "",
    status: formData.get("status") ?? "",
    reviewNote: formData.get("reviewNote") ?? "",
    socials: formData.get("socials") ?? "",
  });
  if (!parsed.success) redirect(backTo(id, "details", "error"));
  const d = parsed.data;

  // The uploader emits one hidden input per file; empty means "unchanged".
  // Clearing is its own checkbox, so saving without a new upload never
  // wipes the image that was there.
  const logo = storedImage(formData.getAll("logo")[0]);
  const banner = storedImage(formData.getAll("banner")[0]);
  const clearLogo = formData.get("clearLogo") != null;
  const clearBanner = formData.get("clearBanner") != null;

  if (process.env.DATABASE_URL) {
    let clashed = false;
    try {
      const [clash] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, d.slug))
        .limit(1);
      clashed = !!clash && clash.id !== id;
      if (!clashed) {
        await db
          .update(partners)
          .set({
            businessName: d.businessName,
            slug: d.slug,
            categoryId: d.categoryId,
            tagline: d.tagline,
            bio: d.bio,
            shopUrl: d.shopUrl,
            status: d.status,
            reviewNote: d.reviewNote,
            reviewedBy: session.user.id,
            isPremium: formData.get("isPremium") != null,
            active: formData.get("active") != null,
            socials: toStoredSocials(parseSocials({ raw: d.socials })),
            ...(clearLogo ? { logoUrl: null } : logo ? { logoUrl: logo } : {}),
            ...(clearBanner
              ? { bannerUrl: null }
              : banner
                ? { bannerUrl: banner }
                : {}),
            updatedAt: new Date(),
          })
          .where(eq(partners.id, id));
      }
    } catch {
      redirect(backTo(id, "details", "error"));
    }
    if (clashed) redirect(backTo(id, "details", "slug"));
  }

  await logActivity({
    actorId: session.user.id,
    action: "partner.update",
    entityType: "partner",
    entityId: id,
  });
  revalidatePartner(id, d.slug);
  redirect(backTo(id, "details", "saved"));
}

/**
 * Delete a partner and everything hanging off it: members, invites,
 * offerings and gallery cascade. Events hosted by them and quest objectives
 * at their stand are kept, with the partner link cleared — the page says so.
 */
export async function deletePartner(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  if (!z.uuid().safeParse(id).success) redirect("/admin/partners");
  let slug: string | null = null;
  if (process.env.DATABASE_URL) {
    try {
      const [row] = await db
        .delete(partners)
        .where(eq(partners.id, id))
        .returning({ slug: partners.slug });
      slug = row?.slug ?? null;
    } catch {
      redirect(backTo(id, "advanced", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.delete",
    entityType: "partner",
    entityId: id,
  });
  revalidatePartner(id, slug);
  redirect("/admin/partners?deleted=1");
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export async function addPartnerGalleryImages(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const kind: "art" | "product" =
    formData.get("kind") === "product" ? "product" : "art";
  const images = formData
    .getAll("images")
    .map(String)
    .filter((u) => isStoredMediaUrl(u));
  if (!images.length) redirect(backTo(id, "gallery", "error"));

  if (process.env.DATABASE_URL) {
    try {
      const [last] = await db
        .select({
          max: sql<number>`coalesce(max(${partnerGalleryItems.sort}), -1)::int`,
        })
        .from(partnerGalleryItems)
        .where(eq(partnerGalleryItems.partnerId, id));
      const base = (last?.max ?? -1) + 1;
      await db.insert(partnerGalleryItems).values(
        images.map((imageUrl, i) => ({
          partnerId: id,
          imageUrl,
          kind,
          sort: base + i,
        }))
      );
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.gallery_add",
    entityType: "partner",
    entityId: id,
    metadata: { count: images.length },
  });
  await revalidateBySlug(id);
  redirect(backTo(id, "gallery", "saved"));
}

export async function removePartnerGalleryImage(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const imageId = String(formData.get("imageId"));
  if (process.env.DATABASE_URL) {
    try {
      await db
        .delete(partnerGalleryItems)
        .where(
          and(
            eq(partnerGalleryItems.id, imageId),
            eq(partnerGalleryItems.partnerId, id)
          )
        );
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.gallery_remove",
    entityType: "partner",
    entityId: id,
  });
  await revalidateBySlug(id);
  redirect(backTo(id, "gallery", "saved"));
}

export async function setPartnerGalleryCaption(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const imageId = String(formData.get("imageId"));
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 300) || null;
  const kind: "art" | "product" =
    formData.get("kind") === "product" ? "product" : "art";
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerGalleryItems)
        .set({ caption, kind })
        .where(
          and(
            eq(partnerGalleryItems.id, imageId),
            eq(partnerGalleryItems.partnerId, id)
          )
        );
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  await revalidateBySlug(id);
  redirect(backTo(id, "gallery", "saved"));
}

/** Swap sort with the neighbour in the given direction. */
export async function movePartnerGalleryImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const imageId = String(formData.get("imageId"));
  const dir = formData.get("dir") === "up" ? -1 : 1;
  if (process.env.DATABASE_URL) {
    try {
      const rows = await db
        .select({ id: partnerGalleryItems.id })
        .from(partnerGalleryItems)
        .where(eq(partnerGalleryItems.partnerId, id))
        .orderBy(partnerGalleryItems.sort, partnerGalleryItems.createdAt);
      const i = rows.findIndex((r) => r.id === imageId);
      const j = i + dir;
      if (i >= 0 && j >= 0 && j < rows.length) {
        const order = rows.map((r) => r.id);
        [order[i], order[j]] = [order[j], order[i]];
        // Renumber the whole set: cheaper to reason about than swapping two
        // sorts that may have been equal.
        await Promise.all(
          order.map((rowId, sort) =>
            db
              .update(partnerGalleryItems)
              .set({ sort })
              .where(eq(partnerGalleryItems.id, rowId))
          )
        );
      }
    } catch {
      redirect(backTo(id, "gallery", "error"));
    }
  }
  await revalidateBySlug(id);
  redirect(backTo(id, "gallery", "saved"));
}

// ---------------------------------------------------------------------------
// Offerings — products & services
// ---------------------------------------------------------------------------

/** Accepts "120", "120.50", "R120" — stored as integer minor units. */
function parsePriceCents(input: unknown): number | null {
  const raw = String(input ?? "").replace(/[^0-9.]/g, "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const offeringSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: optionalText(1000),
  kind: z.enum(["product", "service"]).default("product"),
  currency: z
    .string()
    .trim()
    .transform((v) => (v ? v.toUpperCase() : "ZAR"))
    .refine((v) => /^[A-Z]{3}$/.test(v), { message: "Three-letter code" }),
  externalUrl: optionalLink(),
});

function offeringInput(formData: FormData) {
  return offeringSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    kind: formData.get("kind") || undefined,
    currency: formData.get("currency") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
  });
}

export async function addPartnerOffering(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = offeringInput(formData);
  if (!parsed.success) redirect(backTo(id, "products", "error"));
  const image = storedImage(formData.getAll("image")[0]);

  if (process.env.DATABASE_URL) {
    try {
      const [last] = await db
        .select({
          max: sql<number>`coalesce(max(${partnerOfferings.sort}), -1)::int`,
        })
        .from(partnerOfferings)
        .where(eq(partnerOfferings.partnerId, id));
      await db.insert(partnerOfferings).values({
        partnerId: id,
        kind: parsed.data.kind,
        name: parsed.data.name,
        description: parsed.data.description,
        priceCents: parsePriceCents(formData.get("price")),
        currency: parsed.data.currency,
        imageUrl: image,
        externalUrl: parsed.data.externalUrl,
        active: formData.get("active") !== "0",
        sort: (last?.max ?? -1) + 1,
      });
    } catch {
      redirect(backTo(id, "products", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.offering.add",
    entityType: "partner",
    entityId: id,
  });
  await revalidateBySlug(id);
  redirect(backTo(id, "products", "saved"));
}

/** Edit an offering in place. An empty upload leaves the image alone. */
export async function updatePartnerOffering(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const offeringId = String(formData.get("offeringId"));
  const parsed = offeringInput(formData);
  if (!parsed.success) redirect(backTo(id, "products", "error"));
  const image = storedImage(formData.getAll("image")[0]);
  const clearImage = formData.get("clearImage") != null;

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerOfferings)
        .set({
          kind: parsed.data.kind,
          name: parsed.data.name,
          description: parsed.data.description,
          priceCents: parsePriceCents(formData.get("price")),
          currency: parsed.data.currency,
          externalUrl: parsed.data.externalUrl,
          active: formData.get("active") != null,
          ...(clearImage ? { imageUrl: null } : image ? { imageUrl: image } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(partnerOfferings.id, offeringId),
            eq(partnerOfferings.partnerId, id)
          )
        );
    } catch {
      redirect(backTo(id, "products", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.offering.update",
    entityType: "partner",
    entityId: id,
  });
  await revalidateBySlug(id);
  redirect(backTo(id, "products", "saved"));
}

export async function removePartnerOffering(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const offeringId = String(formData.get("offeringId"));
  if (process.env.DATABASE_URL) {
    try {
      await db
        .delete(partnerOfferings)
        .where(
          and(
            eq(partnerOfferings.id, offeringId),
            eq(partnerOfferings.partnerId, id)
          )
        );
    } catch {
      redirect(backTo(id, "products", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.offering.remove",
    entityType: "partner",
    entityId: id,
  });
  await revalidateBySlug(id);
  redirect(backTo(id, "products", "saved"));
}

export async function movePartnerOffering(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const offeringId = String(formData.get("offeringId"));
  const dir = formData.get("dir") === "up" ? -1 : 1;
  if (process.env.DATABASE_URL) {
    try {
      const rows = await db
        .select({ id: partnerOfferings.id })
        .from(partnerOfferings)
        .where(eq(partnerOfferings.partnerId, id))
        .orderBy(partnerOfferings.sort, partnerOfferings.name);
      const i = rows.findIndex((r) => r.id === offeringId);
      const j = i + dir;
      if (i >= 0 && j >= 0 && j < rows.length) {
        const order = rows.map((r) => r.id);
        [order[i], order[j]] = [order[j], order[i]];
        await Promise.all(
          order.map((rowId, sort) =>
            db
              .update(partnerOfferings)
              .set({ sort })
              .where(eq(partnerOfferings.id, rowId))
          )
        );
      }
    } catch {
      redirect(backTo(id, "products", "error"));
    }
  }
  await revalidateBySlug(id);
  redirect(backTo(id, "products", "saved"));
}

// ---------------------------------------------------------------------------
// Team — members & invitations
// ---------------------------------------------------------------------------

const MAX_PENDING_INVITES = 20;

const inviteSchema = z.object({
  email: z.email().max(320).optional(),
  role: z.enum(["owner", "manager"]).default("manager"),
});

/**
 * Invite someone to manage the stall. Same rules as the hub's version, with
 * one difference: an admin may hand out the owner role freely, since there
 * is no "last owner" to protect from the outside.
 */
export async function invitePartnerMemberAsAdmin(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = inviteSchema.safeParse({
    email: raw || undefined,
    role: formData.get("role") || undefined,
  });
  if (!parsed.success) redirect(backTo(id, "team", "bademail"));
  const email = parsed.data.email ?? null;

  if (process.env.DATABASE_URL) {
    const [p] = await db
      .select({ name: partners.businessName })
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    if (!p) redirect("/admin/partners");

    const [pending] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(partnerInvites)
      .where(and(eq(partnerInvites.partnerId, id), eq(partnerInvites.status, "pending")));
    if ((pending?.n ?? 0) >= MAX_PENDING_INVITES) {
      redirect(backTo(id, "team", "limit"));
    }

    // An address that already has an account becomes a member on the spot —
    // an admin adding a known person shouldn't have to wait for a click.
    const existing = email ? await findUserByEmail(email) : null;
    if (existing) {
      if (await isAlreadyMember(id, existing.id)) {
        redirect(backTo(id, "team", "member"));
      }
      try {
        await db.insert(partnerMembers).values({
          partnerId: id,
          userId: existing.id,
          role: parsed.data.role,
          invitedBy: session.user.id,
        });
        await db
          .update(users)
          .set({ role: "partner" })
          .where(and(eq(users.id, existing.id), eq(users.role, "member")));
      } catch {
        redirect(backTo(id, "team", "error"));
      }
      await logActivity({
        actorId: session.user.id,
        action: "partner.member.add",
        entityType: "partner",
        entityId: id,
      });
      revalidatePartner(id, null);
      redirect(backTo(id, "team", "saved"));
    }

    if (await hasLiveInviteFor(id, email, null)) {
      redirect(backTo(id, "team", "duplicate"));
    }
    const { raw: token, hash } = newInviteToken();
    const expiresAt = inviteExpiry();
    try {
      await db.insert(partnerInvites).values({
        partnerId: id,
        email,
        role: parsed.data.role,
        tokenHash: hash,
        invitedBy: session.user.id,
        expiresAt,
      });
    } catch {
      redirect(backTo(id, "team", "error"));
    }
    if (email) {
      await sendPartnerInvite({
        to: email,
        partnerName: p.name,
        inviterName: session.user.name ?? "Mythical Mecca",
        url: inviteUrl(token),
        expiresAt,
      });
    }
    await logActivity({
      actorId: session.user.id,
      action: "partner.invite.create",
      entityType: "partner",
      entityId: id,
    });
    revalidatePartner(id, null);
    redirect(`/admin/partners/${id}?tab=team&invited=${encodeURIComponent(token)}`);
  }
  redirect(backTo(id, "team", "error"));
}

export async function revokePartnerInviteAsAdmin(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const inviteId = String(formData.get("inviteId"));
  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerInvites)
        .set({ status: "revoked" })
        .where(
          and(
            eq(partnerInvites.id, inviteId),
            eq(partnerInvites.partnerId, id),
            eq(partnerInvites.status, "pending")
          )
        );
    } catch {
      redirect(backTo(id, "team", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.invite.revoke",
    entityType: "partner",
    entityId: id,
  });
  revalidatePartner(id, null);
  redirect(backTo(id, "team", "saved"));
}

export async function removePartnerMemberAsAdmin(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const userId = String(formData.get("userId"));
  if (process.env.DATABASE_URL) {
    try {
      await db
        .delete(partnerMembers)
        .where(
          and(eq(partnerMembers.partnerId, id), eq(partnerMembers.userId, userId))
        );
    } catch {
      redirect(backTo(id, "team", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.member.remove",
    entityType: "partner",
    entityId: id,
  });
  revalidatePartner(id, null);
  redirect(backTo(id, "team", "saved"));
}

export async function setPartnerMemberRoleAsAdmin(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const userId = String(formData.get("userId"));
  const role = formData.get("role") === "owner" ? "owner" : "manager";
  if (process.env.DATABASE_URL) {
    try {
      // Demoting the only owner leaves a stall nobody can run the team of
      // from the hub. An admin can always fix it here, but say so.
      if (role === "manager" && (await countOwners(id)) <= 1) {
        const [target] = await db
          .select({ role: partnerMembers.role })
          .from(partnerMembers)
          .where(
            and(eq(partnerMembers.partnerId, id), eq(partnerMembers.userId, userId))
          )
          .limit(1);
        if (target?.role === "owner") redirect(backTo(id, "team", "lastowner"));
      }
      await db
        .update(partnerMembers)
        .set({ role })
        .where(
          and(eq(partnerMembers.partnerId, id), eq(partnerMembers.userId, userId))
        );
    } catch {
      redirect(backTo(id, "team", "error"));
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.member.role",
    entityType: "partner",
    entityId: id,
    metadata: { role },
  });
  revalidatePartner(id, null);
  redirect(backTo(id, "team", "saved"));
}

// ---------------------------------------------------------------------------

/** Public-page revalidation needs the slug, which these callers don't have. */
async function revalidateBySlug(id: string) {
  let slug: string | null = null;
  if (process.env.DATABASE_URL) {
    try {
      const [row] = await db
        .select({ slug: partners.slug })
        .from(partners)
        .where(eq(partners.id, id))
        .limit(1);
      slug = row?.slug ?? null;
    } catch {
      // Falls through to the id-based paths.
    }
  }
  revalidatePartner(id, slug);
}
