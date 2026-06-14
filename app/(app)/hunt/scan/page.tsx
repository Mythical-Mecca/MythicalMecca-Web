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
              RUNE SEAL
            </p>
            <h1 className="mt-2 text-xl text-[var(--mm-live)]">
              Seal struck · +{points} renown
            </h1>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              Trial cleared. Back to the quest to keep climbing.
            </p>
            <Link
              href={`/hunts/${huntSlug}`}
              className="mm-btn mm-btn-primary mt-6"
            >
              Continue quest
            </Link>
          </>
        ) : (
          <>
            <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--mm-danger)]">
              BROKEN SEAL
            </p>
            <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
              {status === "error"
                ? "This seal could not be struck. It may already be claimed."
                : "This rune seal is false or has expired."}
            </p>
            <Link href="/hunts" className="mm-btn mm-btn-ghost mt-6">
              Quest board
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
