"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  partners,
  partnerGalleryItems,
  partnerMembers,
  partnerInvites,
  partnerOfferings,
  events,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { authorizePartnerAction, listMyPartners } from "@/lib/partner-access";
import { getPartnerForHub } from "@/lib/partner";
import { getCategoryById } from "@/lib/categories";
import { slugify } from "@/lib/slug";
import {
  newInviteToken,
  inviteUrl,
  inviteExpiry,
  countPendingInvites,
  countOwners,
  findUserByEmail,
  isAlreadyMember,
  hasLiveInviteFor,
} from "@/lib/partner-invites";
import { sendPartnerInvite } from "@/lib/mail";
import { isStoredMediaUrl } from "@/lib/media";
import { httpUrl } from "@/lib/url";
import { logActivity } from "@/lib/logging";
import { parseSocials, toStoredSocials } from "@/lib/socials";

/**
 * Every action here is scoped by the `partnerId` posted with the form and
 * verified against partner_members — a user may manage several partner pages,
 * so the session alone no longer identifies which one is being edited. The
 * route-group layout is NOT a boundary for these: a layout does not re-run when
 * an action is invoked, so each action authorizes independently.
 */

/** Paths that must be refreshed after any change to a partner's public face. */
function revalidatePartner(partnerId: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath(`/partners/${slug}`);
  revalidatePath("/partner-hub");
  revalidatePath(`/partner-hub/${partnerId}`);
  revalidatePath(`/partner-hub/${partnerId}/profile`);
  revalidatePath(`/partner-hub/${partnerId}/gallery`);
  revalidatePath("/admin/partners");
}

/**
 * How many stalls one user may open. Nothing here is rate limited (the only
 * limiter in the codebase is the quest claim throttle), so this cap is the
 * whole defence against someone squatting slugs.
 */
const MAX_PARTNERS_PER_USER = 5;

const createSchema = z.object({
  businessName: z.string().min(2).max(160),
  categoryId: z.string().uuid(),
});

/**
 * Self-serve second (third, …) stall. Created as a draft: the owner builds it
 * out and submits it, and an admin must approve before it is public.
 */
export async function createPartnerPage(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const mine = await listMyPartners(session.user.id);
  const isAdmin = roleAtLeast(session.user.role, "admin");
  const isPartner = roleAtLeast(session.user.role, "partner");
  if (!isAdmin && !isPartner && mine.length === 0) redirect("/apply");
  // Count only stalls they own — being invited to manage other people's stalls
  // shouldn't consume their own allowance.
  const owned = mine.filter((m) => m.role === "owner").length;
  if (!isAdmin && owned >= MAX_PARTNERS_PER_USER) {
    redirect("/partner-hub/new?error=limit");
  }

  const parsed = createSchema.safeParse({
    businessName: formData.get("businessName"),
    categoryId: formData.get("categoryId") || undefined,
  });
  if (!parsed.success) redirect("/partner-hub/new?error=1");

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category?.active || !category.allowSelfManage) {
    redirect("/partner-hub/new?error=category");
  }

  let createdId: string | null = null;
  if (process.env.DATABASE_URL) {
    try {
      const [created] = await db
        .insert(partners)
        .values({
          categoryId: parsed.data.categoryId,
          // Same collision-avoidance shape the admin create path uses.
          slug: `${slugify(parsed.data.businessName)}-${Date.now().toString(36)}`,
          businessName: parsed.data.businessName,
          status: "draft",
        })
        .returning({ id: partners.id });
      if (created) {
        createdId = created.id;
        await db.insert(partnerMembers).values({
          partnerId: created.id,
          userId: session.user.id,
          role: "owner",
        });
      }
    } catch {
      redirect("/partner-hub/new?error=1");
    }
    // Outside the try: redirect() throws to signal, so a catch-all would eat it.
    if (!createdId) redirect("/partner-hub/new?error=1");
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.create.self",
    entityType: "partner",
    entityId: createdId ?? undefined,
  });
  revalidatePath("/partner-hub");
  redirect(createdId ? `/partner-hub/${createdId}/profile?created=1` : "/partner-hub");
}

/** Send a draft (or a rejected page) back to the admin review queue. */
export async function submitPartnerForReview(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "owner");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}`;

  if (membership.status !== "draft" && membership.status !== "rejected") {
    redirect(`${base}?error=state`);
  }

  if (process.env.DATABASE_URL) {
    // Minimum bar so reviewers aren't handed an empty page. Checked outside the
    // try: redirect() signals by throwing, and a catch-all would swallow it.
    const partner = await getPartnerForHub(membership.partnerId);
    if (!partner?.businessName || !partner.bio) {
      redirect(`${base}?error=incomplete`);
    }
    try {
      await db
        .update(partners)
        .set({
          status: "pending",
          submittedAt: new Date(),
          reviewNote: null,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, membership.partnerId));
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.submit",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePath("/partner-hub");
  revalidatePath(base);
  revalidatePath("/admin/partners/queue");
  redirect(`${base}?submitted=1`);
}

// ---------------------------------------------------------------------------
// Offerings — products & services
// ---------------------------------------------------------------------------

/**
 * An uploaded image URL, or null. The uploader hands the URL back through the
 * form, so it is attacker-controlled: only a URL in our own Blob store counts
 * as evidence that an upload actually happened.
 */
function storedImage(value: FormDataEntryValue | undefined): string | null {
  const url = String(value ?? "");
  return isStoredMediaUrl(url) ? url : null;
}

/** Accepts "120", "120.50", "R120" — stored as integer minor units. */
function parsePriceCents(input: unknown): number | null {
  const raw = String(input ?? "").replace(/[^0-9.]/g, "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const offeringSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  kind: z.enum(["product", "service"]).default("product"),
  currency: z.string().min(3).max(3).default("ZAR"),
  // httpUrl, not z.string().url(): the latter accepts javascript: and this
  // value is rendered as an href on the public page.
  externalUrl: httpUrl().optional(),
});

export async function addOffering(formData: FormData) {
  const ctx = await authorizePartnerAction(formData);
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/offerings`;

  const parsed = offeringSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    kind: formData.get("kind") || undefined,
    currency: formData.get("currency") || undefined,
    externalUrl: formData.get("externalUrl") || undefined,
  });
  if (!parsed.success) redirect(`${base}?error=1`);

  const image = storedImage(formData.getAll("image")[0]);

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(partnerOfferings).values({
        partnerId: membership.partnerId,
        kind: parsed.data.kind,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        priceCents: parsePriceCents(formData.get("price")),
        currency: parsed.data.currency.toUpperCase(),
        imageUrl: image,
        externalUrl: parsed.data.externalUrl ?? null,
      });
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.offering.add",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePartner(membership.partnerId, membership.slug);
  redirect(`${base}?saved=1`);
}

export async function removeOffering(formData: FormData) {
  const ctx = await authorizePartnerAction(formData);
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/offerings`;
  const id = String(formData.get("id"));

  if (process.env.DATABASE_URL) {
    try {
      // Scoped by partner too — defence against a hand-posted id.
      await db
        .delete(partnerOfferings)
        .where(
          and(
            eq(partnerOfferings.id, id),
            eq(partnerOfferings.partnerId, membership.partnerId)
          )
        );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.offering.remove",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePartner(membership.partnerId, membership.slug);
  redirect(`${base}?saved=1`);
}

/** Show/hide without deleting, and nudge ordering. */
export async function updateOfferingState(formData: FormData) {
  const ctx = await authorizePartnerAction(formData);
  if (!ctx) redirect("/partner-hub?denied=1");
  const { membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/offerings`;
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "1";
  const sortRaw = formData.get("sort");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerOfferings)
        .set({
          active,
          ...(sortRaw != null ? { sort: Number(sortRaw) || 0 } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(partnerOfferings.id, id),
            eq(partnerOfferings.partnerId, membership.partnerId)
          )
        );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  revalidatePartner(membership.partnerId, membership.slug);
  redirect(`${base}?saved=1`);
}

// ---------------------------------------------------------------------------
// Team — members & invitations (owner-only)
// ---------------------------------------------------------------------------

/** No general rate limiting exists in this app, so this cap is the defence. */
const MAX_PENDING_INVITES = 20;

const inviteSchema = z.object({
  email: z.string().email().max(320).optional(),
  role: z.enum(["owner", "manager"]).default("manager"),
});

export async function invitePartnerMember(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "owner");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/team`;

  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = inviteSchema.safeParse({
    email: raw || undefined,
    role: formData.get("role") || undefined,
  });
  if (!parsed.success) redirect(`${base}?error=email`);
  const email = parsed.data.email ?? null;

  if (process.env.DATABASE_URL) {
    if ((await countPendingInvites(membership.partnerId)) >= MAX_PENDING_INVITES) {
      redirect(`${base}?error=limit`);
    }

    // Bind to the account when one exists, so the invite shows up in their hub
    // immediately — that's what makes this work without a mail provider.
    const existing = email ? await findUserByEmail(email) : null;
    if (existing && (await isAlreadyMember(membership.partnerId, existing.id))) {
      redirect(`${base}?error=member`);
    }
    if (await hasLiveInviteFor(membership.partnerId, email, existing?.id ?? null)) {
      redirect(`${base}?error=duplicate`);
    }

    const { raw: token, hash } = newInviteToken();
    const expiresAt = inviteExpiry();
    try {
      await db.insert(partnerInvites).values({
        partnerId: membership.partnerId,
        email,
        invitedUserId: existing?.id ?? null,
        role: parsed.data.role,
        tokenHash: hash,
        invitedBy: session.user.id,
        expiresAt,
      });
    } catch {
      redirect(`${base}?error=1`);
    }

    if (email) {
      // Fails soft when no provider is configured — the copy-link is the
      // fallback and is always shown.
      await sendPartnerInvite({
        to: email,
        partnerName: membership.businessName,
        inviterName: session.user.name ?? "A partner",
        url: inviteUrl(token),
        expiresAt,
      });
    }
    await logActivity({
      actorId: session.user.id,
      action: "partner.invite.create",
      entityType: "partner",
      entityId: membership.partnerId,
    });
    revalidatePath(base);
    // The raw token is shown once, so the inviter can copy the link. Deliberately
    // NOT reporting whether the address matched an account — that would turn this
    // form into a member-enumeration oracle.
    redirect(`${base}?invited=${encodeURIComponent(token)}`);
  }
  redirect(`${base}?error=1`);
}

/**
 * Accept an invitation from inside the hub, addressed by id.
 *
 * The link flow can't be reused here: only the token's hash is stored, so the
 * hub has no raw token to post. Identity is re-proved against the invite's own
 * binding — an id alone grants nothing.
 */
export async function acceptPartnerInviteById(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const inviteId = String(formData.get("inviteId"));

  if (!process.env.DATABASE_URL) redirect("/partner-hub");

  let partnerId: string | null = null;
  try {
    const [invite] = await db
      .select()
      .from(partnerInvites)
      .where(eq(partnerInvites.id, inviteId))
      .limit(1);

    const mine =
      !!invite &&
      invite.status === "pending" &&
      invite.expiresAt.getTime() > Date.now() &&
      (invite.invitedUserId === session.user.id ||
        (!!invite.email &&
          invite.email.toLowerCase() ===
            (session.user.email ?? "").toLowerCase()));
    if (invite && mine) {
      await db
        .insert(partnerMembers)
        .values({
          partnerId: invite.partnerId,
          userId: session.user.id,
          role: invite.role,
        })
        .onConflictDoNothing();
      await db
        .update(partnerInvites)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: session.user.id,
        })
        .where(eq(partnerInvites.id, invite.id));
      // Promote only from `member`; access itself comes from the row above.
      await db
        .update(users)
        .set({ role: "partner" })
        .where(and(eq(users.id, session.user.id), eq(users.role, "member")));
      partnerId = invite.partnerId;
    }
  } catch {
    redirect("/partner-hub?denied=1");
  }

  if (partnerId) {
    await logActivity({
      actorId: session.user.id,
      action: "partner.invite.accept",
      entityType: "partner",
      entityId: partnerId,
    });
  }
  revalidatePath("/partner-hub");
  redirect(partnerId ? `/partner-hub/${partnerId}?welcome=1` : "/partner-hub");
}

export async function revokePartnerInvite(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "owner");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/team`;
  const id = String(formData.get("inviteId"));

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerInvites)
        .set({ status: "revoked" })
        .where(
          and(
            eq(partnerInvites.id, id),
            eq(partnerInvites.partnerId, membership.partnerId)
          )
        );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.invite.revoke",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePath(base);
  redirect(`${base}?saved=1`);
}

export async function removePartnerMember(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "owner");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/team`;
  const userId = String(formData.get("userId"));

  if (process.env.DATABASE_URL) {
    // Removing the last owner would orphan the stall — nobody could ever invite
    // or submit again. Checked outside the try so the redirect isn't swallowed.
    const [target] = await db
      .select({ role: partnerMembers.role })
      .from(partnerMembers)
      .where(
        and(
          eq(partnerMembers.partnerId, membership.partnerId),
          eq(partnerMembers.userId, userId)
        )
      )
      .limit(1);
    if (
      target?.role === "owner" &&
      (await countOwners(membership.partnerId)) <= 1
    ) {
      redirect(`${base}?error=lastowner`);
    }
    try {
      await db
        .delete(partnerMembers)
        .where(
          and(
            eq(partnerMembers.partnerId, membership.partnerId),
            eq(partnerMembers.userId, userId)
          )
        );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.member.remove",
    entityType: "partner",
    entityId: membership.partnerId,
    metadata: { userId },
  });
  revalidatePath(base);
  // Removing yourself means losing access to this stall entirely.
  if (userId === session.user.id) redirect("/partner-hub");
  redirect(`${base}?saved=1`);
}

export async function setPartnerMemberRole(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "owner");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/team`;
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) === "owner" ? "owner" : "manager";

  if (process.env.DATABASE_URL) {
    if (role === "manager" && (await countOwners(membership.partnerId)) <= 1) {
      const [target] = await db
        .select({ role: partnerMembers.role })
        .from(partnerMembers)
        .where(
          and(
            eq(partnerMembers.partnerId, membership.partnerId),
            eq(partnerMembers.userId, userId)
          )
        )
        .limit(1);
      if (target?.role === "owner") redirect(`${base}?error=lastowner`);
    }
    try {
      await db
        .update(partnerMembers)
        .set({ role })
        .where(
          and(
            eq(partnerMembers.partnerId, membership.partnerId),
            eq(partnerMembers.userId, userId)
          )
        );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.member.role",
    entityType: "partner",
    entityId: membership.partnerId,
    metadata: { userId, role },
  });
  revalidatePath(base);
  redirect(`${base}?saved=1`);
}

const profileSchema = z.object({
  businessName: z.string().min(2).max(120).optional(),
  tagline: z.string().max(160).optional(),
  bio: z.string().max(2000).optional(),
  socials: z.string().max(500).optional(),
  shopUrl: httpUrl().optional(),
});

export async function updatePartnerProfile(formData: FormData) {
  const ctx = await authorizePartnerAction(formData);
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;

  const base = `/partner-hub/${membership.partnerId}/profile`;

  const parsed = profileSchema.safeParse({
    businessName: formData.get("businessName") || undefined,
    tagline: formData.get("tagline") || undefined,
    bio: formData.get("bio") || undefined,
    socials: formData.get("socials") || undefined,
    shopUrl: formData.get("shopUrl") || undefined,
  });
  if (!parsed.success) redirect(`${base}?error=1`);

  // The uploader emits one hidden input per file; empty means "unchanged", so
  // clearing an image is a separate explicit action rather than a side effect
  // of saving the form with no new upload.
  //
  // These strings are client-supplied. Unvalidated they would let a partner
  // point their logo at any host and have the homepage hotlink it — leaking
  // every visitor's IP to a third party. Only our own Blob store is accepted.
  const logo = storedImage(formData.getAll("logo")[0]);
  const banner = storedImage(formData.getAll("banner")[0]);

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partners)
        .set({
          ...(parsed.data.businessName ? { businessName: parsed.data.businessName } : {}),
          tagline: parsed.data.tagline,
          bio: parsed.data.bio,
          shopUrl: parsed.data.shopUrl ?? null,
          ...(logo ? { logoUrl: logo } : {}),
          ...(banner ? { bannerUrl: banner } : {}),
          // Normalise on write: the freeform field is parsed into the keyed
          // shape the public page reads, so links render immediately.
          socials: parsed.data.socials
            ? toStoredSocials(parseSocials({ raw: parsed.data.socials }))
            : null,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, membership.partnerId));
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.update",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePartner(membership.partnerId, membership.slug);
  redirect(`${base}?saved=1`);
}

const gallerySchema = z.object({
  caption: z.string().max(300).optional(),
  kind: z.enum(["art", "product"]).default("art"),
  // Must be in our own Blob store — a bare .url() would let a partner hotlink
  // an arbitrary host into the public gallery.
  images: z.array(z.string().url().refine(isStoredMediaUrl)).min(1).max(12),
});

export async function addGalleryItem(formData: FormData) {
  const ctx = await authorizePartnerAction(formData);
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;

  const base = `/partner-hub/${membership.partnerId}/gallery`;

  const images = formData.getAll("images").map(String).filter(Boolean);
  const parsed = gallerySchema.safeParse({
    caption: formData.get("caption") || undefined,
    kind: formData.get("kind") || undefined,
    images,
  });
  if (!parsed.success) redirect(`${base}?error=1`);

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(partnerGalleryItems).values(
        parsed.data.images.map((url) => ({
          partnerId: membership.partnerId,
          imageUrl: url,
          caption: parsed.data.caption,
          kind: parsed.data.kind,
        }))
      );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.gallery.add",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePartner(membership.partnerId, membership.slug);
  redirect(`${base}?saved=1`);
}

export async function removeGalleryItem(formData: FormData) {
  const ctx = await authorizePartnerAction(formData);
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const base = `/partner-hub/${membership.partnerId}/gallery`;
  const id = String(formData.get("id"));

  if (process.env.DATABASE_URL) {
    try {
      // Scoped by partner as well as id: defence in depth against a hand-posted
      // gallery id belonging to someone else's stall.
      await db
        .delete(partnerGalleryItems)
        .where(
          and(
            eq(partnerGalleryItems.id, id),
            eq(partnerGalleryItems.partnerId, membership.partnerId)
          )
        );
    } catch {
      redirect(`${base}?error=1`);
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "partner.gallery.remove",
    entityType: "partner",
    entityId: membership.partnerId,
  });
  revalidatePartner(membership.partnerId, membership.slug);
  redirect(`${base}?saved=1`);
}

const PartnerEventSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(120),
  summary: z.string().trim().max(300).optional(),
  bodyMd: z.string().trim().max(4000).optional(),
  startsAt: z.string().min(1, "Pick a start date and time"),
  endsAt: z.string().min(1, "Pick an end date and time"),
  location: z.string().trim().max(160).optional(),
  externalUrl: z.string().trim().max(500).optional(),
});

/** Allows a registered partner to submit an event for calendar review. */
export async function createPartnerEvent(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "manager");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const returnTo = String(formData.get("returnTo") ?? "");
  const base = returnTo === "hub" ? "/partner-hub?tab=events" : `/partner-hub/${membership.partnerId}/events`;

  const raw = {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? "").trim() || undefined,
    bodyMd: String(formData.get("bodyMd") ?? "").trim() || undefined,
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    location: String(formData.get("location") ?? "").trim() || undefined,
    externalUrl: String(formData.get("externalUrl") ?? "").trim() || undefined,
  };

  const parsed = PartnerEventSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`${base}?error=validation`);
  }

  const starts = new Date(parsed.data.startsAt);
  const ends = new Date(parsed.data.endsAt);
  if (isNaN(starts.getTime()) || isNaN(ends.getTime())) {
    redirect(`${base}?error=invalid_dates`);
  }
  if (ends < starts) {
    redirect(`${base}?error=end_before_start`);
  }

  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(events).values({
        slug,
        title: parsed.data.title,
        summary: parsed.data.summary ?? null,
        bodyMd: parsed.data.bodyMd ?? null,
        startsAt: starts,
        endsAt: ends,
        location: parsed.data.location ?? null,
        externalUrl: parsed.data.externalUrl ?? null,
        // Requires admin approval before going live on the calendar
        status: "pending",
        origin: "partner",
        partnerId: membership.partnerId,
        createdBy: session.user.id,
      });
    } catch (err) {
      console.error("Failed to create partner event:", err);
      redirect(`${base}?error=db`);
    }
  }

  await logActivity({
    actorId: session.user.id,
    action: "partner.event.create",
    entityType: "event",
    entityId: membership.partnerId,
    metadata: { title: parsed.data.title, slug },
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/partner-hub");
  revalidatePath(`/partners/${membership.slug}`);
  revalidatePath(base);
  redirect(`${base}?saved=1`);
}

/** Allows a partner to cancel or delete an event they created. */
export async function deletePartnerEvent(formData: FormData) {
  const ctx = await authorizePartnerAction(formData, "manager");
  if (!ctx) redirect("/partner-hub?denied=1");
  const { session, membership } = ctx;
  const returnTo = String(formData.get("returnTo") ?? "");
  const base = returnTo === "hub" ? "/partner-hub?tab=events" : `/partner-hub/${membership.partnerId}/events`;
  const eventId = String(formData.get("eventId") ?? "");

  if (process.env.DATABASE_URL && eventId) {
    try {
      await db
        .delete(events)
        .where(
          and(
            eq(events.id, eventId),
            eq(events.partnerId, membership.partnerId)
          )
        );
    } catch (err) {
      console.error("Failed to delete partner event:", err);
      redirect(`${base}?error=delete`);
    }
  }

  await logActivity({
    actorId: session.user.id,
    action: "partner.event.delete",
    entityType: "event",
    entityId: eventId,
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/partner-hub");
  revalidatePath(`/partners/${membership.slug}`);
  revalidatePath(base);
  redirect(`${base}?deleted=1`);
}

