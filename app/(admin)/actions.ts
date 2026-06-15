"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  posts,
  events,
  vendors,
  vendorApplications,
  users,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { logActivity } from "@/lib/logging";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "admin")) redirect("/dashboard");
  return session;
}

const postSchema = z.object({
  title: z.string().min(2).max(200),
  excerpt: z.string().max(400).optional(),
  bodyMd: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const session = await requireAdmin();
  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || undefined,
    bodyMd: formData.get("bodyMd"),
  });
  if (!parsed.success) redirect("/command/posts?error=1");

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(posts).values({
        authorId: session.user.id,
        slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        bodyMd: parsed.data.bodyMd,
        status: "published",
        publishedAt: new Date(),
      });
    } catch {
      redirect("/command/posts?error=1");
    }
  }
  await logActivity({ actorId: session.user.id, action: "post.create" });
  revalidatePath("/command/posts");
  revalidatePath("/news");
  redirect("/command/posts?created=1");
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
  });
  if (!parsed.success) {
    return { error: "Add a title (2+ characters) and pick a date and time." };
  }

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(events).values({
        slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
        title: parsed.data.title,
        summary: parsed.data.summary,
        bodyMd: parsed.data.bodyMd,
        location: parsed.data.location,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        status: "published",
        createdBy: session.user.id,
      });
    } catch {
      return { error: "Could not save the event. Please try again." };
    }
  }
  await logActivity({ actorId: session.user.id, action: "event.create" });
  revalidatePath("/command/events");
  revalidatePath("/events");
  redirect("/command/events?created=1");
}

export async function approveApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "");

  if (process.env.DATABASE_URL) {
    try {
      const [app] = await db
        .select()
        .from(vendorApplications)
        .where(eq(vendorApplications.id, id))
        .limit(1);
      if (app) {
        await db
          .update(vendorApplications)
          .set({
            status: "approved",
            reviewedBy: session.user.id,
            reviewNote: note || null,
            updatedAt: new Date(),
          })
          .where(eq(vendorApplications.id, id));
        await db
          .update(users)
          .set({ role: "vendor" })
          .where(eq(users.id, app.userId));
        await db
          .insert(vendors)
          .values({
            userId: app.userId,
            slug: `${slugify(app.businessName)}-${Date.now().toString(36)}`,
            businessName: app.businessName,
            tagline: app.pitch.slice(0, 140),
          })
          .onConflictDoNothing();
      }
    } catch {
      redirect("/command/applications?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "vendor_application.approve",
    entityId: id,
  });
  revalidatePath("/command/applications");
  redirect("/command/applications?done=1");
}

export async function rejectApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "");

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(vendorApplications)
        .set({
          status: "rejected",
          reviewedBy: session.user.id,
          reviewNote: note || null,
          updatedAt: new Date(),
        })
        .where(eq(vendorApplications.id, id));
    } catch {
      redirect("/command/applications?error=1");
    }
  }
  await logActivity({
    actorId: session.user.id,
    action: "vendor_application.reject",
    entityId: id,
  });
  revalidatePath("/command/applications");
  redirect("/command/applications?done=1");
}
