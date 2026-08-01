"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { verifyTagToken } from "@/lib/qr";
import {
  claimObjective,
  getClaimTarget,
  logClaimAttempt,
  type ClaimOutcome,
} from "@/lib/hunts";
import { logActivity } from "@/lib/logging";

/**
 * `signed_out` is deliberately distinct from `not_open`: an expired session
 * used to be reported as "this quest isn't running", sending someone off to
 * find a steward about an event that is running perfectly well.
 */
export type ClaimState = { outcome?: ClaimOutcome | "signed_out" };

/** Coarse client address, for spotting one device claiming on behalf of many. */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");
}

export async function submitClaim(
  _prev: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const session = await auth();
  if (!session?.user) return { outcome: "signed_out" };

  const stepId = verifyTagToken(String(formData.get("token") ?? ""));
  const ip = await clientIp();
  if (!stepId) {
    await logClaimAttempt({
      stepId: null,
      userId: session.user.id,
      outcome: "unknown_step",
      ip,
    });
    return { outcome: "unknown_step" };
  }

  const target = await getClaimTarget(stepId, session.user.id);
  if (!target) {
    await logClaimAttempt({
      stepId: null,
      userId: session.user.id,
      outcome: "unknown_step",
      ip,
    });
    return { outcome: "unknown_step" };
  }

  const outcome = await claimObjective({
    target,
    userId: session.user.id,
    code: String(formData.get("code") ?? "").trim() || undefined,
    lat: formData.get("lat") ? Number(formData.get("lat")) : undefined,
    lng: formData.get("lng") ? Number(formData.get("lng")) : undefined,
    ip,
  });

  if (outcome === "ok") {
    await logActivity({
      actorId: session.user.id,
      action: "quest.objective.claim",
      entityType: "hunt_step",
      entityId: stepId,
    });
    revalidatePath(`/quests/${target.huntSlug}`);
    revalidatePath("/dashboard");
  }

  return { outcome };
}
