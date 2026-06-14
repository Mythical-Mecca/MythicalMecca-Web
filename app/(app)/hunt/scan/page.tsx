import Link from "next/link";
import { auth } from "@/lib/auth";
import { verifyToken } from "@/lib/qr";
import { getStepRaw, recordCompletion } from "@/lib/hunts";
import { awardXp } from "@/lib/gamification";
import { logActivity } from "@/lib/logging";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const session = await auth();
  const parsed = t ? verifyToken(t) : null;

  let status: "ok" | "invalid" | "error" = "invalid";
  let huntSlug = "";
  let points = 0;

  if (parsed && session?.user) {
    huntSlug = parsed.huntSlug;
    const step = await getStepRaw(parsed.huntSlug, parsed.stepId);
    if (step && step.type === "qr_scan") {
      const done = await recordCompletion(
        parsed.huntSlug,
        parsed.stepId,
        session.user.id,
        step.points,
        { scanned: true }
      );
      if (done) {
        await awardXp(
          session.user.id,
          step.points,
          "hunt_qr",
          "hunt_step",
          parsed.stepId
        );
        await logActivity({
          actorId: session.user.id,
          action: "hunt.qr.scan",
          entityId: parsed.stepId,
        });
        points = step.points;
        status = "ok";
      } else {
        status = "error";
      }
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mm-glass max-w-md p-8 text-center">
        {status === "ok" ? (
          <>
            <p className="font-[family-name:var(--font-display)] text-4xl mm-gradient-text">
              UPLINK
            </p>
            <h1 className="mt-2 text-xl text-[var(--mm-live)]">
              Data received · +{points} XP
            </h1>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              Objective cleared. Back to the hunt to keep climbing.
            </p>
            <Link
              href={`/hunts/${huntSlug}`}
              className="mm-btn mm-btn-primary mt-6"
            >
              Continue hunt
            </Link>
          </>
        ) : (
          <>
            <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--mm-danger)]">
              SIGNAL LOST
            </p>
            <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
              {status === "error"
                ? "Could not record this scan. It may already be logged."
                : "This uplink token is invalid or expired."}
            </p>
            <Link href="/hunts" className="mm-btn mm-btn-ghost mt-6">
              Ops board
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
