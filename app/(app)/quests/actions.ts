"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  getStepRaw,
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
  const session = await auth();
  const huntSlug = String(formData.get("huntSlug") ?? "");
  if (!session?.user) redirect(`/login?from=/quests/${huntSlug}`);
  const stepId = String(formData.get("stepId") ?? "");

  const found = await getStepRaw(huntSlug, stepId);
  if (!found) redirect(`/quests/${huntSlug}?serr=${stepId}`);
  const { step, huntId, huntOpen } = found;

  // The same window that gates destination check-ins. Without this, answers
  // could be submitted while a quest was still being staged, or after it
  // closed and the scores were called.
  if (!huntOpen) redirect(`/quests/${huntSlug}?closed=1`);

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
    await logClaimAttempt({
      stepId,
      userId: session.user.id,
      outcome: "bad_code",
      ip,
    });
    redirect(`/quests/${huntSlug}?fail=${stepId}#step-${stepId}`);
  }

  const written = await recordCompletion(
    huntId,
    stepId,
    session.user.id,
    step.points,
    submitted
  );

  // `false` here means the row already existed — a double tap on a laggy
  // connection. That is a success from the player's point of view; telling
  // them it failed would send them retrying work that already saved.
  await logClaimAttempt({
    stepId,
    userId: session.user.id,
    outcome: written ? "ok" : "duplicate",
    ip,
  });

  if (written) {
    await logActivity({
      actorId: session.user.id,
      action: "hunt.step.complete",
      entityType: "hunt_step",
      entityId: stepId,
    });
  }

  revalidatePath(`/quests/${huntSlug}`);
  redirect(`/quests/${huntSlug}?ok=${stepId}#step-${stepId}`);
}
