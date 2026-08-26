"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerInvites, partnerMembers, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { findInviteByToken } from "@/lib/partner-invites";
import { logActivity } from "@/lib/logging";

/**
 * Whether this session may accept this invitation.
 *
 * Bound invites (an account or an address) must match — a forwarded link must
 * not grant access to whoever opens it. An invite with neither is a deliberate
 * "anyone with the link" invite, and the UI labels it as such.
 */
function identityMatches(
  invite: { invitedUserId: string | null; email: string | null },
  user: { id: string; email?: string | null }
): boolean {
  if (invite.invitedUserId) return invite.invitedUserId === user.id;
  if (invite.email) {
    return (user.email ?? "").toLowerCase() === invite.email.toLowerCase();
  }
  return true;
}

export async function acceptPartnerInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?from=/partner-invite/${encodeURIComponent(token)}`);
  }

  // Re-resolved and re-checked here: the page render proves nothing about the
  // request that actually mutates.
  const invite = await findInviteByToken(token);
  if (
    !invite ||
    invite.status !== "pending" ||
    invite.expired ||
    !identityMatches(invite, session.user)
  ) {
    redirect(`/partner-invite/${encodeURIComponent(token)}?error=invalid`);
  }

  if (process.env.DATABASE_URL) {
    try {
      await db
        .insert(partnerMembers)
        .values({
          partnerId: invite.partnerId,
          userId: session.user.id,
          role: invite.role,
        })
        // partner_members_unique makes a double-submit a no-op.
        .onConflictDoNothing();
      await db
        .update(partnerInvites)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: session.user.id,
        })
        .where(eq(partnerInvites.id, invite.id));
      // Promote only from `member` so an admin isn't demoted. Note the hub does
      // not depend on this — access comes from the membership row above, which
      // is why the invitee lands in the hub without re-authenticating.
      await db
        .update(users)
        .set({ role: "partner" })
        .where(and(eq(users.id, session.user.id), eq(users.role, "member")));
    } catch {
      redirect(`/partner-invite/${encodeURIComponent(token)}?error=1`);
    }
  }

  await logActivity({
    actorId: session.user.id,
    action: "partner.invite.accept",
    entityType: "partner",
    entityId: invite.partnerId,
  });
  revalidatePath("/partner-hub");
  redirect(`/partner-hub/${invite.partnerId}?welcome=1`);
}

export async function declinePartnerInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invite = await findInviteByToken(token);
  if (!invite || !identityMatches(invite, session.user)) {
    redirect("/partner-hub");
  }

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(partnerInvites)
        .set({ status: "revoked" })
        .where(eq(partnerInvites.id, invite.id));
    } catch {
      // Declining is best-effort — never strand the user on an error page.
    }
  }
  revalidatePath("/partner-hub");
  redirect("/partner-hub");
}
