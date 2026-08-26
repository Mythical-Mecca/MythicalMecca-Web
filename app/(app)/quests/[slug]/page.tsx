import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHunt, getLeaderboard, type PublicStep } from "@/lib/hunts";
import { completeStep } from "../actions";
import { GeoStep } from "@/components/geo-step";
import { PhotoStep } from "@/components/photo-step";
import { PlayerQuestActions } from "@/components/player-quest-actions";
import { Icon } from "@/components/icon";
import { inputPill } from "@/components/form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hunt = await getHunt(slug);
  return { title: hunt?.title ?? "Quest" };
}

// `inputPill` is painted --mm-surface, which is right when an input sits on
// the page and wrong here, where it sits inside a panel of that same colour.
const inputCls = `mm-inset flex-1 ${inputPill}`;

/** In-app answer forms. Destination objectives are claimed at the stand. */
function StepBody({ step, slug }: { step: PublicStep; slug: string }) {
  switch (step.type) {
    case "riddle":
    case "crossword":
    case "cipher":
      return (
        <form action={completeStep} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="huntSlug" value={slug} />
          <input type="hidden" name="stepId" value={step.id} />
          <input
            name="answer"
            placeholder="Your answer"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button className="mm-btn mm-btn-primary shrink-0 justify-center text-sm">
            Submit
          </button>
        </form>
      );
    case "unlock_code":
      return (
        <form action={completeStep} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="huntSlug" value={slug} />
          <input type="hidden" name="stepId" value={step.id} />
          <input
            name="code"
            placeholder="Enter code"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button className="mm-btn mm-btn-primary shrink-0 justify-center text-sm">
            Unlock
          </button>
        </form>
      );
    case "trivia_gate":
      return (
        <form action={completeStep} className="mt-3 space-y-2">
          <input type="hidden" name="huntSlug" value={slug} />
          <input type="hidden" name="stepId" value={step.id} />
          <div className="space-y-1.5">
            {(step.choices ?? []).map((c, i) => (
              <label
                key={i}
                className="mm-inset flex min-h-11 items-center gap-2.5 rounded-xl border border-[var(--mm-border)] px-3 py-2.5 text-sm"
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
      return (
        <div className="mt-3">
          <GeoStep huntSlug={slug} stepId={step.id} />
        </div>
      );
    case "photo_proof":
      return (
        <div className="mt-3">
          <PhotoStep huntSlug={slug} stepId={step.id} />
        </div>
      );
    case "qr_scan":
      return (
        <p className="mm-inset mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-[var(--mm-text-dim)]">
          <Icon
            icon="mdi:qrcode-scan"
            width={16}
            className="shrink-0 text-[var(--mm-gold)]"
          />
          Scan at the stand — or show your pass and let them scan you.
        </p>
      );
    default:
      return null;
  }
}

/** Where the objective sends you. Withheld entirely while it's still a clue. */
function Destination({ step }: { step: PublicStep }) {
  const d = step.destination;
  if (!d) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--mm-violet)]">
        <Icon icon="game-icons:secret-book" width={15} className="shrink-0" />
        Work out where this one sends you.
      </p>
    );
  }
  if (!d.partnerName && !d.locationHint) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {d.partnerName &&
        (d.partnerSlug ? (
          <Link
            href={`/partners/${d.partnerSlug}`}
            className="inline-flex min-h-6 items-center gap-1.5 text-[var(--mm-gold)] hover:underline"
          >
            <Icon icon="game-icons:anvil" width={15} className="shrink-0" />
            {d.partnerName}
            <Icon icon="mdi:chevron-right" width={14} />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[var(--mm-gold)]">
            <Icon icon="game-icons:anvil" width={15} className="shrink-0" />
            {d.partnerName}
          </span>
        ))}
      {d.locationHint && (
        <span className="inline-flex items-center gap-1.5 text-[var(--mm-text-dim)]">
          <Icon icon="mdi:map-marker-outline" width={15} className="shrink-0" />
          {d.locationHint}
        </span>
      )}
    </div>
  );
}

function ObjectiveCard({
  step,
  index,
  slug,
  featured,
  flash,
  isFirst,
  prevDone,
}: {
  step: PublicStep;
  index: number;
  slug: string;
  featured: boolean;
  flash: { ok: boolean; fail: boolean };
  /** The path starts at the first node, so it gets no incoming segment. */
  isFirst: boolean;
  /** Lights the segment arriving at this node — the ground already covered. */
  prevDone: boolean;
}) {
  return (
    <li
      id={`step-${step.id}`}
      style={
        {
          // oklab, not srgb: mixing gold into the navy surface in srgb cancels
          // the blue and lands on a warm grey. oklab keeps the surface reading
          // as navy and just warms it.
          "--panel": step.done
            ? "color-mix(in oklab, var(--mm-live) 7%, var(--mm-surface))"
            : featured && !step.locked
              ? "color-mix(in oklab, var(--mm-gold) 9%, var(--mm-surface))"
              : undefined,
          // The two halves of the connector are lit by the step each one
          // belongs to, so the gold stops exactly where progress does.
          "--trail-seg-in": prevDone ? "var(--mm-gold)" : undefined,
          "--trail-seg-out": step.done ? "var(--mm-gold)" : undefined,
        } as React.CSSProperties
      }
      className={`mm-glass mm-panel mm-trail-out relative p-4 transition ${
        isFirst ? "" : "mm-trail-in"
      } ${
        step.done
          ? "border-[var(--mm-live)] opacity-70"
          : step.locked
            ? "opacity-60"
            : featured
              ? "border-[var(--mm-gold)]"
              : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium ${
            step.done
              ? "bg-[var(--mm-live)] text-[#070b1e]"
              : featured
                ? "mm-node-next bg-[var(--mm-gold)] text-[#160f0a]"
                : "mm-inset text-[var(--mm-text-dim)] ring-1 ring-[var(--mm-divider)]"
          }`}
        >
          {step.done ? (
            <Icon icon="mdi:check" width={16} />
          ) : step.locked ? (
            <Icon icon="mdi:lock-outline" width={14} />
          ) : (
            index + 1
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium leading-tight">
              {step.title}
              {featured && !step.done && (
                // The gold border alone carried this, which is colour-only
                // meaning — and the one question a player has is "which one now?"
                <span className="ml-2 whitespace-nowrap rounded-full bg-[var(--mm-gold)] px-2 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wider text-[#160f0a]">
                  Next up
                </span>
              )}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--mm-gold)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--mm-gold)]">
              <Icon icon="game-icons:two-coins" width={12} />
              {step.points}
            </span>
          </div>

          {step.done ? (
            <p className="mt-1 text-sm text-[var(--mm-live)]">
              {/* The success flash has to live in THIS branch: by the time the
                  redirect lands the step is already done, so a flash rendered
                  in the not-done branch below could never be seen. */}
              {flash.ok ? "Just cleared — nice one." : "Cleared"}
            </p>
          ) : step.locked ? (
            /* Locked: say what it is waiting for and stop there. No prompt, no
               destination, no claim control — the objective isn't open, and
               showing the way to it would give away a clue the player hasn't
               earned. The tag itself is refused server-side too. */
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)]">
              <Icon icon="mdi:lock-outline" width={14} className="shrink-0" />
              {step.lockedBy ? (
                <>
                  Opens once{" "}
                  <span className="text-[var(--mm-text)]">{step.lockedBy}</span>{" "}
                  is cleared
                </>
              ) : (
                "Not open yet"
              )}
            </p>
          ) : (
            <>
              {step.prompt && (
                <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">
                  {step.prompt}
                </p>
              )}
              <Destination step={step} />
              {flash.fail && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-sm text-[var(--mm-danger)]"
                >
                  Not quite — try again.
                </p>
              )}
              <StepBody step={step} slug={slug} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default async function HuntDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    ok?: string;
    fail?: string;
    closed?: string;
    locked?: string;
    from?: string;
  }>;
}) {
  const { slug } = await params;
  const { ok, fail, closed, locked, from } = await searchParams;
  const session = await auth();
  const hunt = await getHunt(slug, session?.user?.id);
  if (!hunt) notFound();
  const leaderboard = await getLeaderboard(slug);

  // Honour a safe internal ?from= (e.g. arriving from an event page).
  const returnHref = from && from.startsWith("/") ? from : "/quests";
  const returnLabel =
    from && from.startsWith("/") ? "Back to event" : "Quest board";

  const doneCount = hunt.steps.filter((s) => s.done).length;
  const pct = hunt.steps.length
    ? Math.round((doneCount / hunt.steps.length) * 100)
    : 0;
  // A suggestion, not a gate — but it has to point at something the player can
  // actually do, so locked objectives are skipped.
  const next = hunt.steps.find((s) => !s.done && !s.locked) ?? null;
  const nextId = next?.id ?? null;
  const finished = doneCount === hunt.steps.length && hunt.steps.length > 0;

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      {/* The shared backdrop is a full-page photograph held at ~75% darkness
          all the way down, which puts detailed artwork behind the objective
          list — the part of this page people read in a hall, on a phone, often
          in sunlight.

          This scrim keeps the artwork behind the title and lets it fall away
          to flat background by the time the content starts. It is anchored to
          the page, not the viewport: a fixed version kept a transparent strip
          at the top of the *screen*, so as you scrolled, artwork went on
          showing through the gaps between objectives as a warm smear.

          It also gives the panels below something calm to fade into — over the
          photograph the fade read as smearing rather than softening. Phones
          only; on a wide screen the cards are discrete and the artwork behind
          them is the point. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 inset-y-0 -z-10 sm:hidden"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0, var(--mm-bg) 320px)",
        }}
      />

      <Link
        href={returnHref}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        <Icon icon="mdi:chevron-left" width={16} /> {returnLabel}
      </Link>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-xl leading-tight tracking-wide sm:text-3xl">
          {hunt.title}
        </h1>
        {hunt.description && (
          <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">
            {hunt.description}
          </p>
        )}
        {hunt.eventSlug && (
          <Link
            href={`/events/${hunt.eventSlug}`}
            className="mt-1.5 inline-flex min-h-6 items-center gap-1.5 text-sm text-[var(--mm-gold)] hover:underline"
          >
            <Icon icon="game-icons:campfire" width={15} /> Part of{" "}
            {hunt.eventTitle}
          </Link>
        )}
      </header>

      {(!hunt.open || closed) && (
        <div
          role="status"
          className="mm-glass mm-panel mt-4 border-[var(--mm-gold)] p-4 text-sm"
        >
          <Icon icon="mdi:pause-circle-outline" width={16} className="mr-1.5 inline" />
          This quest isn&apos;t running right now — check-ins are closed. Your
          progress so far is safe.
        </div>
      )}

      {locked && (
        <div
          role="alert"
          className="mm-glass mm-panel mt-4 border-[var(--mm-gold)] p-4 text-sm"
        >
          <Icon icon="mdi:lock-outline" width={16} className="mr-1.5 inline" />
          That one isn&apos;t open yet — clear what it&apos;s waiting on first.
          Nothing was lost.
        </div>
      )}

      {/* Progress. The single most-glanced-at thing on the page. */}
      <section className="mm-glass mm-panel mt-3 p-4 sm:mt-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl">
              {doneCount}
              <span className="text-[var(--mm-text-dim)]">
                /{hunt.steps.length}
              </span>
            </p>
            <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              Objectives
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--mm-gold)]">
              {hunt.earnedPoints}
              <span className="text-[var(--mm-text-dim)]">
                /{hunt.totalPoints}
              </span>
            </p>
            <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              Points
            </p>
          </div>
        </div>
        {hunt.steps.length <= 12 ? (
          <div className="mt-3 flex gap-1">
            {hunt.steps.map((s) => (
              <span
                key={s.id}
                className={`h-2.5 flex-1 rounded-full transition ${
                  s.done
                    ? "bg-[var(--mm-gold)] shadow-[0_0_8px_color-mix(in_srgb,var(--mm-gold)_55%,transparent)]"
                    : "mm-inset"
                }`}
              />
            ))}
          </div>
        ) : (
          /* Past a dozen the pips are narrower than the gaps between them and
             stop being countable, which was their whole advantage. */
          <div className="mm-inset mt-3 h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--mm-gold)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {finished ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--mm-live)]">
            <Icon icon="game-icons:laurels-trophy" width={18} />
            Trail complete — every stand visited.
          </p>
        ) : (
          <>
            {next && (
              // The one question someone has mid-hall, answered without making
              // them read the whole list.
              <p className="mt-3 flex items-start gap-1.5 text-sm">
                <Icon
                  icon="mdi:navigation-variant-outline"
                  width={16}
                  className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
                />
                <span>
                  <span className="text-[var(--mm-text-dim)]">Next: </span>
                  {next.destination?.partnerName ?? next.title}
                  {next.destination?.locationHint && (
                    <span className="text-[var(--mm-text-dim)]">
                      {" "}
                      · {next.destination.locationHint}
                    </span>
                  )}
                </span>
              </p>
            )}
            {/* The numbered list implies an order, so say whether the quest
                actually enforces one. */}
            <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
              {hunt.sequential
                ? "Work through them in order."
                : "Visit them in any order."}
            </p>
          </>
        )}
      </section>

      <h2 className="mb-3 mt-6 font-[family-name:var(--font-display)] text-sm uppercase tracking-widest text-[var(--mm-gold)] sm:mt-8">
        The Trail
      </h2>

      <ol className="mm-trail space-y-6 sm:space-y-3">
        {hunt.steps.map((step, i) => (
          <ObjectiveCard
            key={step.id}
            step={step}
            index={i}
            slug={slug}
            featured={step.id === nextId}
            flash={{ ok: ok === step.id, fail: fail === step.id }}
            isFirst={i === 0}
            prevDone={i > 0 && hunt.steps[i - 1].done}
          />
        ))}

        {/* The end of the path. Without it the trail stops in mid-air after
            the last objective and there is nothing on screen to walk toward,
            which is most of what makes a trail worth walking. */}
        <li
          className="mm-trail-in relative -mx-4 flex items-center gap-3 px-4 sm:mx-0"
          style={
            {
              "--trail-seg-in": finished ? "var(--mm-gold)" : undefined,
            } as React.CSSProperties
          }
        >
          <span
            className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              finished
                ? "bg-[var(--mm-gold)] text-[#160f0a] shadow-[0_0_16px_color-mix(in_srgb,var(--mm-gold)_65%,transparent)]"
                : "mm-inset text-[var(--mm-text-dim)] ring-1 ring-[var(--mm-divider)]"
            }`}
          >
            <Icon
              icon={finished ? "game-icons:open-chest" : "game-icons:locked-chest"}
              width={17}
            />
          </span>
          <p
            className={`text-sm ${
              finished ? "text-[var(--mm-gold)]" : "text-[var(--mm-text-dim)]"
            }`}
          >
            {finished ? (
              <>Hoard claimed — all {hunt.totalPoints} points banked.</>
            ) : (
              <>
                Clear all {hunt.steps.length} to claim the hoard —{" "}
                <span className="text-[var(--mm-gold)]">
                  {hunt.totalPoints} points
                </span>
              </>
            )}
          </p>
        </li>
      </ol>

      {leaderboard.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-sm uppercase tracking-widest text-[var(--mm-gold)]">
            Leaderboard
          </h2>
          <ol className="mm-glass mm-panel divide-y divide-[var(--mm-divider)]">
            {leaderboard.map((r, i) => {
              // Finding yourself in a list of twenty names in a loud hall is
              // needlessly hard; mark the row.
              const isMe = r.userId === session?.user?.id;
              return (
                <li
                  key={r.userId}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                    isMe
                      ? "bg-[color-mix(in_srgb,var(--mm-gold)_12%,transparent)]"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-medium ${
                        i < 3
                          ? "text-[#0b0f1c]"
                          : "mm-inset text-[var(--mm-text-dim)]"
                      }`}
                      style={
                        i < 3
                          ? {
                              background: ["#FFB13D", "#c9d1e6", "#c8813f"][i],
                            }
                          : undefined
                      }
                    >
                      {i + 1}
                    </span>
                    {r.name}
                    {isMe && (
                      <span className="text-xs text-[var(--mm-gold)]">you</span>
                    )}
                  </span>
                  <span className="text-[var(--mm-gold)]">{r.points}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <PlayerQuestActions />
    </div>
  );
}
