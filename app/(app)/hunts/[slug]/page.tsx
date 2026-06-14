import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHunt, getLeaderboard, type PublicStep } from "@/lib/hunts";
import { qrDataUrl } from "@/lib/qrcode";
import { uplinkUrl } from "@/lib/qr";
import { completeStep } from "../actions";
import { GeoStep } from "@/components/geo-step";
import { PhotoStep } from "@/components/photo-step";

const inputCls =
  "flex-1 rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]";

async function StepBody({
  step,
  slug,
}: {
  step: PublicStep;
  slug: string;
}) {
  if (step.done) {
    return (
      <p className="text-sm text-[var(--mm-live)]">
        ✓ Objective complete · +{step.points} XP
      </p>
    );
  }

  switch (step.type) {
    case "riddle":
    case "crossword":
    case "cipher":
      return (
        <form action={completeStep} className="flex gap-2">
          <input type="hidden" name="huntSlug" value={slug} />
          <input type="hidden" name="stepId" value={step.id} />
          <input name="answer" placeholder="Your answer" className={inputCls} />
          <button className="mm-btn mm-btn-primary text-sm">Submit</button>
        </form>
      );
    case "unlock_code":
      return (
        <form action={completeStep} className="flex gap-2">
          <input type="hidden" name="huntSlug" value={slug} />
          <input type="hidden" name="stepId" value={step.id} />
          <input name="code" placeholder="Enter code" className={inputCls} />
          <button className="mm-btn mm-btn-primary text-sm">Unlock</button>
        </form>
      );
    case "trivia_gate":
      return (
        <form action={completeStep} className="space-y-2">
          <input type="hidden" name="huntSlug" value={slug} />
          <input type="hidden" name="stepId" value={step.id} />
          <div className="space-y-1.5">
            {(step.choices ?? []).map((c, i) => (
              <label
                key={i}
                className="flex items-center gap-2 text-sm text-[var(--mm-text-dim)]"
              >
                <input type="radio" name="choice" value={i} required />
                {c}
              </label>
            ))}
          </div>
          <button className="mm-btn mm-btn-primary text-sm">Answer</button>
        </form>
      );
    case "geo_checkpoint":
      return <GeoStep huntSlug={slug} stepId={step.id} />;
    case "photo_proof":
      return <PhotoStep huntSlug={slug} stepId={step.id} />;
    case "qr_scan": {
      const dataUrl = await qrDataUrl(uplinkUrl(slug, step.id));
      return (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="Uplink QR"
            width={110}
            height={110}
            className="rounded-lg"
          />
          <p className="text-xs text-[var(--mm-text-dim)]">
            Scan this uplink on-site, or{" "}
            <Link
              href={uplinkUrl(slug, step.id).replace(
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                ""
              )}
              className="text-[var(--mm-gold)]"
            >
              tap to simulate the scan
            </Link>
            .
          </p>
        </div>
      );
    }
    default:
      return null;
  }
}

export default async function HuntDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; fail?: string }>;
}) {
  const { slug } = await params;
  const { ok, fail } = await searchParams;
  const session = await auth();
  const hunt = await getHunt(slug, session?.user.id);
  if (!hunt) notFound();
  const leaderboard = await getLeaderboard(slug);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div>
          <Link
            href="/hunts"
            className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
          >
            ← Ops board
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
            {hunt.title}
          </h1>
          <p className="mt-2 text-[var(--mm-text-dim)]">{hunt.description}</p>
          <p className="mt-3 text-sm">
            <span className="text-[var(--mm-gold)]">
              {hunt.earnedPoints}
            </span>{" "}
            / {hunt.totalPoints} XP earned
          </p>
        </div>

        <ol className="space-y-4">
          {hunt.steps.map((step, i) => (
            <li
              key={step.id}
              id={`step-${step.id}`}
              className={`mm-glass p-5 ${
                step.done ? "border-[var(--mm-live)]" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">
                  <span className="text-[var(--mm-text-dim)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>{" "}
                  {step.title}
                </h3>
                <span className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  {step.type.replace("_", " ")} · {step.points}
                </span>
              </div>
              {step.prompt && (
                <p className="mb-3 text-sm text-[var(--mm-text-dim)]">
                  {step.prompt}
                </p>
              )}
              {ok === step.id && (
                <p className="mb-2 text-sm text-[var(--mm-live)]">
                  Objective cleared!
                </p>
              )}
              {fail === step.id && (
                <p className="mb-2 text-sm text-[var(--mm-danger)]">
                  Not quite — try again.
                </p>
              )}
              <StepBody step={step} slug={slug} />
            </li>
          ))}
        </ol>
      </div>

      <aside className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-sm uppercase tracking-widest text-[var(--mm-gold)]">
          Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-[var(--mm-text-dim)]">
            The board populates as pilots complete objectives.
          </p>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((r, i) => (
              <li
                key={i}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span>
                  <span className="text-[var(--mm-text-dim)]">{i + 1}.</span>{" "}
                  {r.name}
                </span>
                <span className="text-[var(--mm-gold)]">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
