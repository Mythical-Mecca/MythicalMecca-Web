"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  getStepRaw,
  verifyStep,
  recordCompletion,
} from "@/lib/hunts";
import { awardXp, awardBadge } from "@/lib/gamification";
import { logActivity } from "@/lib/logging";

export async function completeStep(formData: FormData) {
  const session = await auth();
  const huntSlug = String(formData.get("huntSlug") ?? "");
  if (!session?.user) redirect(`/login?from=/hunts/${huntSlug}`);
  const stepId = String(formData.get("stepId") ?? "");

  const step = await getStepRaw(huntSlug, stepId);
  if (!step) redirect(`/hunts/${huntSlug}?serr=${stepId}`);

  const submitted: Record<string, unknown> = {
    answer: formData.get("answer") ?? undefined,
    code: formData.get("code") ?? undefined,
    choice: formData.get("choice") ?? undefined,
    lat: formData.get("lat") ?? undefined,
    lng: formData.get("lng") ?? undefined,
    fileUrl: formData.get("fileUrl") ?? undefined,
  };

  if (!verifyStep(step, submitted)) {
    redirect(`/hunts/${huntSlug}?fail=${stepId}#step-${stepId}`);
  }

  await recordCompletion(
    huntSlug,
    stepId,
    session.user.id,
    step.points,
    submitted
  );
  await awardXp(session.user.id, step.points, "hunt_step", "hunt_step", stepId);
  await awardBadge(session.user.id, "hunt_started");
  await logActivity({
    actorId: session.user.id,
    action: "hunt.step.complete",
    entityType: "hunt_step",
    entityId: stepId,
  });

  revalidatePath(`/hunts/${huntSlug}`);
  redirect(`/hunts/${huntSlug}?ok=${stepId}#step-${stepId}`);
}
