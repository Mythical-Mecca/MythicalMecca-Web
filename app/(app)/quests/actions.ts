"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { claimantFor, claimantId } from "@/lib/claimant";
import {
  getStepRaw,
  huntEventFor,
  verifyStep,
  recordCompletion,
  logClaimAttempt,
} from "@/lib/hunts";
import { logActivity } from "@/lib/logging";

/**
 * In-app objectives — riddles, codes, trivia, photo proof. Objectives that are
 * claimed at a destination go through `/q/[token]` instead.
 */
export async function completeStep(formData: FormData) {
  const huntSlug = String(formData.get("huntSlug") ?? "");
  const stepId = String(formData.get("stepId") ?? "");

  // Which sign-in counts is the event's call, so the quest's event is resolved
  // before anyone is turned away. A no-data event sends them to its own panel
  // on the quest page rather than to /login, which admits nobody there.
  const event = await huntEventFor(huntSlug);
  const who = event ? await claimantFor(event.id, event.noDataMode) : null;
  if (!who) {
    redirect(
      event?.noDataMode
        ? `/quests/${huntSlug}?signin=1`
        : `/login?from=/quests/${huntSlug}`
    );
  }

  const found = await getStepRaw(huntSlug, stepId, who);
  if (!found) redirect(`/quests/${huntSlug}?serr=${stepId}`);
  const { step, huntId, huntOpen } = found;

  // The same window that gates destination check-ins. Without this, answers
  // could be submitted while a quest was still being staged, or after it
  // closed and the scores were called.
  if (!huntOpen) redirect(`/quests/${huntSlug}?closed=1`);

  // Ordering holds here too. Logged like any other refused claim so a run of
  // them shows up on the admin monitor.
  if (found.lockedBy) {
    await logClaimAttempt({ stepId, who, outcome: "locked", ip: null });
    redirect(`/quests/${huntSlug}?locked=${stepId}#step-${stepId}`);
  }

  const submitted: Record<string, unknown> = {
    answer: formData.get("answer") ?? undefined,
    code: formData.get("code") ?? undefined,
    choice: formData.get("choice") ?? undefined,
    lat: formData.get("lat") ?? undefined,
    lng: formData.get("lng") ?? undefined,
    fileUrl: formData.get("fileUrl") ?? undefined,
  };

  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");

  if (!verifyStep(step, submitted)) {
    // Logged like every other claim path, so a burst of wrong answers is
    // visible on the admin monitor rather than invisible.
    await logClaimAttempt({ stepId, who, outcome: "bad_code", ip });
    redirect(`/quests/${huntSlug}?fail=${stepId}#step-${stepId}`);
  }

  const written = await recordCompletion(huntId, stepId, who, step.points, submitted);

  // `false` here means the row already existed — a double tap on a laggy
  // connection. That is a success from the player's point of view; telling
  // them it failed would send them retrying work that already saved.
  await logClaimAttempt({
    stepId,
    who,
    outcome: written ? "ok" : "duplicate",
    ip,
  });

  // Members only: an event player is scoped to one event by design, and
  // writing their handle into the site-wide activity trail would carry it
  // straight out of the event that promised to keep it.
  if (written && who.kind === "member") {
    await logActivity({
      actorId: claimantId(who),
      action: "hunt.step.complete",
      entityType: "hunt_step",
      entityId: stepId,
    });
  }

  revalidatePath(`/quests/${huntSlug}`);
  redirect(`/quests/${huntSlug}?ok=${stepId}#step-${stepId}`);
}
