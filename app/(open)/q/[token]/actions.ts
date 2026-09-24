"use server";

import { headers } from "next/headers";
import { verifyTagToken } from "@/lib/qr";
import { claimantFor, claimantId } from "@/lib/claimant";
import { revalidateHunt } from "@/lib/revalidate-hunt";
import {
  claimObjective,
  forClaimant,
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
  const stepId = verifyTagToken(String(formData.get("token") ?? ""));
  const ip = await clientIp();
  if (!stepId) {
    await logClaimAttempt({
      stepId: null,
      who: null,
      outcome: "unknown_step",
      ip,
    });
    return { outcome: "unknown_step" };
  }

  // The step comes first, because which kind of sign-in counts here is the
  // event's decision and the event isn't known until the tag is resolved.
  const target = await getClaimTarget(stepId);
  if (!target) {
    await logClaimAttempt({
      stepId: null,
      who: null,
      outcome: "unknown_step",
      ip,
    });
    return { outcome: "unknown_step" };
  }

  const who = await claimantFor(target.eventId, target.noDataMode);
  if (!who) return { outcome: "signed_out" };

  const outcome = await claimObjective({
    target: await forClaimant(target, who),
    who,
    code: String(formData.get("code") ?? "").trim() || undefined,
    lat: formData.get("lat") ? Number(formData.get("lat")) : undefined,
    lng: formData.get("lng") ? Number(formData.get("lng")) : undefined,
    ip,
  });

  if (outcome === "ok") {
    // Players are event-scoped and deliberately not part of the member
    // activity trail — logging one there would put a name from a no-data
    // event into the very audit log the event promised it wouldn't reach.
    if (who.kind === "member") {
      await logActivity({
        actorId: claimantId(who),
        action: "quest.objective.claim",
        entityType: "hunt_step",
        entityId: stepId,
      });
    }
    revalidateHunt(target.huntSlug);
  }

  return { outcome };
}
