"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events, chatMessages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { logActivity } from "@/lib/logging";

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
