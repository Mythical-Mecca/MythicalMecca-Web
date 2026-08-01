import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authorizeStation } from "@/lib/station-access";
import { verifyPlayerPass } from "@/lib/qr";
import {
  claimViaStation,
  displayName,
  getClaimTarget,
  logClaimAttempt,
  recentStationCheckIns,
} from "@/lib/hunts";
import { logActivity } from "@/lib/logging";

/**
 * The vendor scanned a player's pass. Everything needed to trust this is
 * already established: the session belongs to the stand, and the pass is
 * short-lived, so the player must have been standing there.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ stepId: string }> }
) {
  const { stepId } = await params;

  const ctx = await authorizeStation(stepId);
  if (!ctx) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let pass = "";
  try {
    const body = await req.json();
    pass = String(body?.pass ?? "");
  } catch {
    return NextResponse.json({ outcome: "bad_pass" }, { status: 400 });
  }

  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");

  const userId = verifyPlayerPass(pass);
  if (!userId) {
    // Expired or forged. Logged without a user, since we don't know who it was.
    await logClaimAttempt({ stepId, userId: null, outcome: "bad_code", ip });
    return NextResponse.json({ outcome: "bad_pass" });
  }

  const target = await getClaimTarget(stepId, userId);
  if (!target) return NextResponse.json({ outcome: "unknown_step" });

  const [outcome, name] = await Promise.all([
    claimViaStation({ target, userId, ip }),
    displayName(userId),
  ]);

  if (outcome === "ok") {
    await logActivity({
      actorId: userId,
      action: "quest.objective.claim",
      entityType: "hunt_step",
      entityId: stepId,
    });
  }

  return NextResponse.json({
    outcome,
    name,
    points: target.points,
    recent: await recentStationCheckIns(stepId),
  });
}
