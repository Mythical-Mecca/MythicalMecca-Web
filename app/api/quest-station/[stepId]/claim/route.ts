import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authorizeStation } from "@/lib/station-access";
import { verifyPlayerPass } from "@/lib/qr";
import {
  claimViaStation,
  claimantName,
  forClaimant,
  getClaimTarget,
  logClaimAttempt,
  recentStationCheckIns,
} from "@/lib/hunts";
import { claimantId } from "@/lib/claimant";
import { logActivity } from "@/lib/logging";
import { revalidateHunt } from "@/lib/revalidate-hunt";

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

  // The pass says which kind of adventurer it belongs to; whether that kind
  // is welcome at this event is claimViaStation's call, not the scanner's.
  const who = verifyPlayerPass(pass);
  if (!who) {
    // Expired or forged. Logged without a claimant, since we don't know who.
    await logClaimAttempt({ stepId, who: null, outcome: "bad_code", ip });
    return NextResponse.json({ outcome: "bad_pass" });
  }

  const base = await getClaimTarget(stepId);
  if (!base) return NextResponse.json({ outcome: "unknown_step" });
  const target = await forClaimant(base, who);

  const [outcome, name] = await Promise.all([
    claimViaStation({ target, who, ip }),
    claimantName(who),
  ]);

  if (outcome === "ok") {
    revalidateHunt(target.huntSlug);
    if (who.kind === "member") {
      await logActivity({
        actorId: claimantId(who),
        action: "quest.objective.claim",
        entityType: "hunt_step",
        entityId: stepId,
      });
    }
  }

  return NextResponse.json({
    outcome,
    name,
    points: target.points,
    recent: await recentStationCheckIns(stepId),
  });
}
