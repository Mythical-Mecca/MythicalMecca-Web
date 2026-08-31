import Link from "next/link";
import { notFound } from "next/navigation";
import { claimantFor } from "@/lib/claimant";
import { BackLink } from "@/components/back-link";
import { parseReturn, withReturn, type ReturnTo } from "@/lib/return-to";
import { playerForEvent } from "@/lib/event-player";
import { PlayerSignIn } from "@/components/player-sign-in";
import { playerSignOut } from "@/app/(open)/player-actions";
import {
  getHunt,
  type HuntView,
  type PublicStep,
  type StepType,
} from "@/lib/hunts";
import { completeStep } from "@/app/(app)/quests/actions";
import { GeoStep } from "@/components/geo-step";
import { PhotoStep } from "@/components/photo-step";
import { PlayerQuestActions } from "@/components/player-quest-actions";
import { Icon } from "@/components/icon";
import { inputPill } from "@/components/form";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hunt = await getHunt(slug);
  if (!hunt) {
    return pageMetadata({
      title: "Quest",
      description: "This quest has ended or the link is no longer good.",
    });
  }

  // What a shared link unfurls as in a group chat. The quest's own blurb comes
  // first because it's the part someone wrote to sell the thing; the trail
  // length is the fact people actually ask about before committing an evening.
  const trail = `${hunt.steps.length} ${
    hunt.steps.length === 1 ? "objective" : "objectives"
  } to clear for ${hunt.totalPoints} points.`;
  const where = hunt.eventTitle ? ` Part of ${hunt.eventTitle}.` : "";

  return pageMetadata({
    title: hunt.title,
    description: hunt.description?.trim()
      ? `${hunt.description.trim()} ${trail}${where}`
      : `A quest around the venue — ${trail}${where}`,
  });
}

// `inputPill` is painted --mm-surface, which is right when an input sits on
// the page and wrong here, where it sits inside a panel of that same colour.
const inputCls = `mm-inset flex-1 ${inputPill}`;

/** In-app answer forms. Destination objectives are claimed at the stand. */
function StepBody({
  step,
  slug,
  expanded,
}: {
  step: PublicStep;
  slug: string;
  /** Say the whole thing here rather than on every card — see qr_scan. */
  expanded: boolean;
}) {
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
      return expanded ? (
        <p className="mm-inset mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-[var(--mm-text-dim)]">
          <Icon
            icon="mdi:qrcode-scan"
            width={16}
            className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
          />
          <span>Scan at the stand — or show your pass and let them scan you.</span>
        </p>
      ) : (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--mm-elevated)_80%,transparent)] px-2.5 py-1 text-xs text-[var(--mm-text-dim)] ring-1 ring-[color-mix(in_srgb,var(--mm-divider)_80%,transparent)]">
          <Icon
            icon="mdi:qrcode-scan"
            width={13}
            className="shrink-0 text-[var(--mm-gold)]"
          />
          Scan to check in
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
      <span className="inline-flex items-center gap-1.5 text-[var(--mm-violet)]">
        <Icon icon="game-icons:secret-book" width={15} className="shrink-0" />
        Work out where this one sends you.
      </span>
    );
  }
  if (!d.partnerName && !d.locationHint) return null;
  return (
    <>
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
    </>
  );
}

/**
 * What an objective looks like when it has no face of its own — one glyph per
 * kind of task, so a riddle and a photo drop are told apart before either is
 * read.
 */
const STEP_ICON: Record<StepType, string> = {
  qr_scan: "mdi:qrcode-scan",
  riddle: "game-icons:secret-book",
  crossword: "game-icons:secret-book",
  cipher: "game-icons:secret-book",
  geo_checkpoint: "mdi:map-marker",
  photo_proof: "mdi:camera-outline",
  trivia_gate: "mdi:comment-question-outline",
  unlock_code: "mdi:key-variant",
};

/**
 * The bead on the trail.
 *
 * A stand on a venue quest is a *place with a face*, and a player crossing a
 * hall is looking for a shopfront, not a list item — so where the objective
 * names a partner, the node is that partner's picture. Recognising the logo
 * on the counter is the whole task, and this is the only place we can put it
 * that is in the player's eye the entire walk over.
 *
 * The fallbacks step down in specificity: the partner's own initial (never a
 * shared glyph, which would make every unbranded stall look like the same
 * shop), then a glyph for the kind of task.
 *
 * A locked objective shows none of it. Its destination is withheld everywhere
 * else on the card for the same reason — a picture of the stand is the answer
 * to a puzzle the player hasn't earned yet, and it would leak it in the one
 * element that can't be read past.
 */
function StepAvatar({
  step,
  index,
  featured,
}: {
  step: PublicStep;
  index: number;
  featured: boolean;
}) {
  const partner = step.locked ? null : step.destination;
  const ring = step.done
    ? "ring-[var(--mm-live)]"
    : featured && !step.locked
      ? "ring-[var(--mm-gold)]"
      : "ring-[color-mix(in_srgb,var(--mm-divider)_90%,transparent)]";

  return (
    // z-10 so the node masks the trail line running underneath it — that
    // overlap is what makes it a bead on a thread.
    <span className="relative z-10 shrink-0">
      <span
        className={`grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[var(--mm-elevated)] ring-2 ${ring} ${
          featured && !step.done && !step.locked ? "mm-node-next" : ""
        }`}
      >
        {partner?.partnerLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={partner.partnerLogo}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : partner?.partnerName ? (
          <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--mm-gold)]">
            {partner.partnerName.trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <Icon
            icon={step.locked ? "mdi:lock-outline" : STEP_ICON[step.type]}
            width={26}
            className={
              step.locked ? "text-[var(--mm-text-dim)]" : "text-[var(--mm-gold)]"
            }
          />
        )}
      </span>

      {/* The number moved off the face and onto a badge, because the face is
          now the partner's. Ringed in the card's own colour so it reads as
          sitting on the avatar rather than inside it. */}
      <span
        className={`absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold tabular-nums ring-2 ring-[var(--mm-surface)] ${
          step.done
            ? "bg-[var(--mm-live)] text-[#070b1e]"
            : featured && !step.locked
              ? "bg-[var(--mm-gold)] text-[#160f0a]"
              : "bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]"
        }`}
      >
        {step.done ? (
          <Icon icon="mdi:check" width={14} />
        ) : step.locked ? (
          <Icon icon="mdi:lock-outline" width={12} />
        ) : (
          index + 1
        )}
      </span>
    </span>
  );
}

/**
 * One half of the HUD: a quiet label, then the count that matters, then the
 * total it is measured against — greyed, because "3" is the number being read
 * and "/8" is only the scale it sits on.
 */
function Stat({
  icon,
  label,
  value,
  total,
  gold = false,
}: {
  icon: string;
  label: string;
  value: number;
  total: number;
  gold?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--mm-text-dim)]">
        <Icon icon={icon} width={14} className="shrink-0" />
        {label}
      </p>
      <p
        className={`mt-0.5 font-[family-name:var(--font-display)] text-[2rem] leading-none tabular-nums ${
          gold ? "text-[var(--mm-gold)]" : ""
        }`}
      >
        {value}
        <span className="text-[0.6em] text-[var(--mm-text-dim)]">/{total}</span>
      </p>
    </div>
  );
}

function ObjectiveCard({
  step,
  index,
  slug,
  featured,
  expanded,
  flash,
  isFirst,
  prevDone,
}: {
  step: PublicStep;
  index: number;
  slug: string;
  /** Singled out as the one to do now. Only ever true on a sequential quest. */
  featured: boolean;
  /**
   * Carries the long-form instruction for its step type. Distinct from
   * the featured flag: the wording is worth saying once and has to land
   * somewhere, so it goes on the first open objective whether or not the
   * quest ranks them. It is a place to put a sentence, not a marker.
   */
  expanded: boolean;
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
      className={`mm-card mm-trail-out relative p-4 transition ${
        isFirst ? "" : "mm-trail-in"
      } ${
        step.done
          ? "border-[color-mix(in_srgb,var(--mm-live)_45%,transparent)] opacity-75"
          : step.locked
            ? "opacity-55"
            : featured
              ? // The one card that should pull the eye across a hall: a full
                // gold border and a soft halo, not a hairline that a phone
                // screen in daylight loses.
                "border-[var(--mm-gold)] shadow-[0_0_0_1px_var(--mm-gold),0_8px_28px_-8px_color-mix(in_srgb,var(--mm-gold)_55%,transparent)]"
              : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <StepAvatar step={step} index={index} featured={featured} />

        <div className="min-w-0 flex-1">
          {featured && !step.done && (
            // The gold border alone carried this, which is colour-only
            // meaning — and the one question a player has is "which one now?"
            <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--mm-gold)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#160f0a]">
              <Icon icon="mdi:navigation-variant" width={11} />
              Next up
            </p>
          )}
          <h3 className="text-balance text-[1.05rem] font-semibold leading-snug">
            {step.title}
          </h3>

          {/* What the objective is worth and where it sends you, on one
              wrapping row. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {/* The reward, struck like a coin: a ring rather than a flat
                wash, so it reads as a token you collect and not as another
                label. */}
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                step.done
                  ? "bg-[color-mix(in_srgb,var(--mm-live)_16%,transparent)] text-[var(--mm-live)] ring-1 ring-[color-mix(in_srgb,var(--mm-live)_35%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--mm-gold)_14%,transparent)] text-[var(--mm-gold)] ring-1 ring-[color-mix(in_srgb,var(--mm-gold)_35%,transparent)]"
              }`}
            >
              <Icon icon="game-icons:two-coins" width={13} />
              {step.points}
            </span>
            {!step.done && !step.locked && <Destination step={step} />}
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
              {flash.fail && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-sm text-[var(--mm-danger)]"
                >
                  Not quite — try again.
                </p>
              )}
              <StepBody step={step} slug={slug} expanded={expanded} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Everything above the trail, as one object.
 *
 * The name of the quest, who is playing it, how far in they are and where to
 * walk next were four separate blocks stacked down the screen — four edges,
 * four rhythms, and on a phone they filled the fold before a single objective
 * appeared. They are all answers to "what am I in the middle of", so they are
 * one card with rules between them: identity, then the player, then the two
 * numbers, then the track, then the instruction.
 */
function QuestHeader({
  hunt,
  player,
  doneCount,
  pct,
  next,
  finished,
}: {
  hunt: HuntView;
  /** Only ever set at a no-data event — see <PlayerSignIn>. */
  player: { handle: string } | null;
  doneCount: number;
  pct: number;
  next: PublicStep | null;
  finished: boolean;
}) {
  const rule =
    "border-t border-[color-mix(in_srgb,var(--mm-divider)_75%,transparent)]";

  return (
    <section className="mm-card mt-3 overflow-hidden">
      {/* Identity. The event is the eyebrow rather than a footnote: it is the
          context the title is read inside, and the way back out to it. */}
      <div className="px-4 pt-4 pb-3.5">
        {hunt.eventSlug && (
          <Link
            href={withReturn(`/events/${hunt.eventSlug}`, {
              href: `/quests/${hunt.slug}`,
              label: hunt.title,
            })}
            className="inline-flex min-h-6 items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--mm-gold)] hover:underline"
          >
            <Icon icon="game-icons:campfire" width={14} />
            {hunt.eventTitle}
          </Link>
        )}
        <h1 className="mt-1.5 text-balance font-[family-name:var(--font-display)] text-xl leading-tight tracking-wide sm:text-3xl">
          {hunt.title}
        </h1>
        {hunt.description && (
          <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">
            {hunt.description}
          </p>
        )}
      </div>

      {player && (
        <div
          className={`${rule} flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--mm-elevated)] text-[var(--mm-gold)] ring-2 ring-[color-mix(in_srgb,var(--mm-gold)_45%,transparent)]">
              <Icon icon="game-icons:hood" width={26} />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
                Playing as
              </span>
              <span className="block truncate font-[family-name:var(--font-display)] text-lg leading-tight tracking-wide">
                {player.handle}
              </span>
            </span>
          </span>
          {/* Handing your phone to a friend so they can start their own trail
              is a real thing at a stand, so this stays a proper target — but
              a quiet one, sized well below the name it sits next to. */}
          <form action={playerSignOut} className="shrink-0">
            <input type="hidden" name="path" value={`/quests/${hunt.slug}`} />
            <button className="inline-flex min-h-8 items-center rounded-full border border-[color-mix(in_srgb,var(--mm-border)_80%,transparent)] px-3 py-1 text-xs text-[var(--mm-text-dim)] transition-colors hover:border-[var(--mm-gold)] hover:text-[var(--mm-text)]">
              Not you?
            </button>
          </form>
        </div>
      )}

      {/* The two numbers that matter, large and lit. */}
      <div
        className={`${rule} grid grid-cols-2 divide-x divide-[color-mix(in_srgb,var(--mm-divider)_75%,transparent)]`}
      >
        <Stat
          icon="game-icons:flag-objective"
          label="Cleared"
          value={doneCount}
          total={hunt.steps.length}
        />
        <Stat
          icon="game-icons:two-coins"
          label="Points"
          value={hunt.earnedPoints}
          total={hunt.totalPoints}
          gold
        />
      </div>

      {/* The track. Its own band, a shade darker than the card, so the lit
          segments have something to be lit against. */}
      <div className="mm-inset px-4 py-3">
        {hunt.steps.length <= 12 ? (
          <div className="flex gap-1.5">
            {hunt.steps.map((st) => (
              <span
                key={st.id}
                className={`h-2.5 flex-1 rounded-full transition ${
                  st.done
                    ? "bg-[var(--mm-gold)] shadow-[0_0_10px_color-mix(in_srgb,var(--mm-gold)_60%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--mm-divider)_80%,transparent)]"
                }`}
              />
            ))}
          </div>
        ) : (
          /* Past a dozen the pips are narrower than the gaps between them and
             stop being countable, which was their whole advantage. */
          <div className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--mm-divider)_80%,transparent)]">
            <div
              className="h-full rounded-full bg-[var(--mm-gold)] shadow-[0_0_10px_color-mix(in_srgb,var(--mm-gold)_60%,transparent)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* The rule of the trail: where to go next if the quest ranks its
          objectives, and otherwise the fact that it doesn't. */}
      <div className={`${rule} px-4 py-3`}>
        {finished ? (
          <p className="flex items-center gap-2 font-medium text-[var(--mm-live)]">
            <Icon
              icon="game-icons:laurels-trophy"
              width={20}
              className="shrink-0"
            />
            Trail complete — every stand visited.
          </p>
        ) : !next ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            Nothing open right now — clear what a locked objective is waiting
            on.
          </p>
        ) : hunt.sequential ? (
          /* Where to walk. The one question someone has mid-hall on a trail
             that must be walked in order, answered without making them read
             the whole list. */
          <>
            <p className="flex items-start gap-2">
              <Icon
                icon="mdi:navigation-variant"
                width={18}
                className="mt-px shrink-0 text-[var(--mm-gold)]"
              />
              <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--mm-text-dim)]">
                  Next
                </span>
                <span className="block font-medium leading-snug">
                  {next.destination?.partnerName ?? next.title}
                </span>
                {next.destination?.locationHint && (
                  <span className="block text-sm text-[var(--mm-text-dim)]">
                    {next.destination.locationHint}
                  </span>
                )}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              Work through them in order.
            </p>
          </>
        ) : (
          <p className="flex items-center gap-2 text-[var(--mm-text-dim)]">
            <Icon
              icon="mdi:shuffle-variant"
              width={18}
              className="shrink-0 text-[var(--mm-gold)]"
            />
            Visit them in any order.
          </p>
        )}
      </div>
    </section>
  );
}

/** The signed-out view: enough to decide it's worth signing in for. */
function QuestTeaser({
  hunt,
  from,
  backTo,
}: {
  hunt: HuntView;
  from: string;
  backTo: ReturnTo;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* The page carries no nav, so this is the only way back. It shows
          itself only to a member or to somebody who arrived from elsewhere on
          the site — a cold arrival from a shared link has nowhere to go back
          to. See <BackLink>. */}
      <div className="-ml-1 mb-4">
        <BackLink to={backTo} />
      </div>
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--mm-gold)]">
          {hunt.open ? "A quest is running" : "Quest"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-wide sm:text-4xl">
          {hunt.title}
        </h1>
        {hunt.description && (
          <p className="mx-auto mt-3 max-w-lg text-[var(--mm-text-dim)]">
            {hunt.description}
          </p>
        )}
        {hunt.eventTitle && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--mm-gold)]">
            <Icon icon="game-icons:campfire" width={15} /> Part of{" "}
            {hunt.eventTitle}
          </p>
        )}
      </header>

      {/* One card: what is waiting, why to come in, and the way in. The
          gradient runs from a lit top edge down to nothing, so the card fades
          into the page instead of ending on a hard line — and the border is
          lit on the same side, which is what makes glass read as glass rather
          than as a grey box. */}
      <section
        className="mt-7 overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--mm-border)_55%,transparent)] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--mm-surface)_92%,transparent),color-mix(in_srgb,var(--mm-surface)_38%,transparent))] shadow-[inset_0_1px_0_color-mix(in_srgb,white_10%,transparent)]"
      >
        <div className="grid grid-cols-2 divide-x divide-[color-mix(in_srgb,var(--mm-divider)_70%,transparent)] p-5 text-center">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl">
              {hunt.steps.length}
            </p>
            <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              {hunt.steps.length === 1 ? "Objective" : "Objectives"}
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--mm-gold)]">
              {hunt.totalPoints}
            </p>
            <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              Points
            </p>
          </div>
        </div>

        {!hunt.open && (
          <p
            role="status"
            className="border-t border-[color-mix(in_srgb,var(--mm-divider)_70%,transparent)] px-5 py-3 text-center text-sm text-[var(--mm-text-dim)]"
          >
            <Icon
              icon="mdi:pause-circle-outline"
              width={16}
              className="mr-1.5 inline"
            />
            This quest isn&apos;t running right now.
          </p>
        )}

        <div className="border-t border-[color-mix(in_srgb,var(--mm-divider)_70%,transparent)] px-5 py-6 text-center">
          {hunt.noDataMode ? (
            <PlayerSignIn
              eventId={hunt.eventId}
              eventTitle={hunt.eventTitle}
              path={`/quests/${hunt.slug}`}
              bare
            />
          ) : (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
                Walk the trail
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--mm-text-dim)]">
                {hunt.open
                  ? "Sign in to see the objectives and check in at each stand as you go."
                  : "Sign in to see the trail and your progress so far."}
              </p>
              <Link
                href={`/login?from=${encodeURIComponent(from)}`}
                className="mm-btn mm-btn-primary mt-5"
              >
                <Icon icon="mdi:account" width={18} /> Sign in to continue
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
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
    fromLabel?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { ok, fail, closed, locked } = sp;
  const backTo = parseReturn(sp, { href: "/quests", label: "Quest board" });
  // The trail is fetched twice over: once to learn which event this is (and
  // therefore which kind of sign-in counts here), then again with whoever
  // that turns out to be, so progress is resolved for the right adventurer.
  const shell = await getHunt(slug);
  if (!shell) notFound();
  const who = await claimantFor(shell.eventId, shell.noDataMode);
  const hunt = who ? ((await getHunt(slug, who)) ?? shell) : shell;

  /**
   * Signed out, this page is a shop window, not the quest.
   *
   * The trail itself is withheld deliberately: the objectives name the stands
   * a player is meant to walk to, and that is not a stranger's to read from
   * a forwarded link.
   * What's left — what this is, how long it runs, whose event it belongs to —
   * is exactly what the link preview already promised.
   */
  if (!who) {
    return (
      <QuestTeaser
        hunt={hunt}
        backTo={backTo}
        from={withReturn(`/quests/${slug}`, sp.from ? { href: sp.from, label: sp.fromLabel ?? "" } : null)}
      />
    );
  }

  // Only ever set at a no-data event, where there is no site header to sign
  // out from — the merged QuestHeader carries the sign-out.
  const player =
    who.kind === "player" ? await playerForEvent(hunt.eventId) : null;

  const doneCount = hunt.steps.filter((s) => s.done).length;
  const pct = hunt.steps.length
    ? Math.round((doneCount / hunt.steps.length) * 100)
    : 0;
  // A suggestion, not a gate — but it has to point at something the player can
  // actually do, so locked objectives are skipped.
  const next = hunt.steps.find((s) => !s.done && !s.locked) ?? null;
  const nextId = next?.id ?? null;
  // Only a quest that enforces an order has a "next". On a free-order trail
  // every open objective is equally the next one, so singling the topmost out
  // — gold border, halo, a NEXT UP banner — is the page inventing a sequence
  // it has just finished telling the player does not exist.
  const featuredId = hunt.sequential ? nextId : null;
  const finished = doneCount === hunt.steps.length && hunt.steps.length > 0;

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">

      <div className="-ml-1 px-1">
        <BackLink to={backTo} />
      </div>

      <QuestHeader
        hunt={hunt}
        player={player}
        doneCount={doneCount}
        pct={pct}
        next={next}
        finished={finished}
      />

      {(!hunt.open || closed) && (
        <div
          role="status"
          className="mm-card mt-4 border-[var(--mm-gold)] p-4 text-sm"
        >
          <Icon icon="mdi:pause-circle-outline" width={16} className="mr-1.5 inline" />
          This quest isn&apos;t running right now — check-ins are closed. Your
          progress so far is safe.
        </div>
      )}

      {locked && (
        <div
          role="alert"
          className="mm-card mt-4 border-[var(--mm-gold)] p-4 text-sm"
        >
          <Icon icon="mdi:lock-outline" width={16} className="mr-1.5 inline" />
          That one isn&apos;t open yet — clear what it&apos;s waiting on first.
          Nothing was lost.
        </div>
      )}


      {/* A centred rule-and-title, so the list below reads as a section
          rather than as more of the panel above it. The rules fade outward so
          they meet the page instead of stopping at a hard end. */}
      <h2 className="mt-8 mb-4 flex items-center gap-4 font-[family-name:var(--font-display)] text-lg uppercase tracking-widest text-[var(--mm-gold)] sm:mt-10">
        <span
          aria-hidden
          className="h-px flex-1 bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--mm-gold)_45%,transparent))]"
        />
        Objectives
        <span
          aria-hidden
          className="h-px flex-1 bg-[linear-gradient(to_left,transparent,color-mix(in_srgb,var(--mm-gold)_45%,transparent))]"
        />
      </h2>

      <ol className="mm-trail space-y-6 sm:space-y-3">
        {hunt.steps.map((step, i) => (
          <ObjectiveCard
            key={step.id}
            step={step}
            index={i}
            slug={slug}
            featured={step.id === featuredId}
            expanded={step.id === nextId}
            flash={{ ok: ok === step.id, fail: fail === step.id }}
            isFirst={i === 0}
            prevDone={i > 0 && hunt.steps[i - 1].done}
          />
        ))}

        {/* The end of the path. Without it the trail stops in mid-air after
            the last objective and there is nothing on screen to walk toward,
            which is most of what makes a trail worth walking. */}
        <li
          className="mm-trail-in relative flex items-center gap-3 p-4"
          style={
            {
              "--trail-seg-in": finished ? "var(--mm-gold)" : undefined,
            } as React.CSSProperties
          }
        >
          <span
            className={`relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full ring-2 ${
              finished
                ? "bg-[var(--mm-gold)] text-[#160f0a] ring-[var(--mm-gold)] shadow-[0_0_24px_color-mix(in_srgb,var(--mm-gold)_65%,transparent)]"
                : "bg-[var(--mm-elevated)] text-[var(--mm-text-dim)] ring-[color-mix(in_srgb,var(--mm-divider)_90%,transparent)]"
            }`}
          >
            <Icon
              icon={finished ? "game-icons:open-chest" : "game-icons:locked-chest"}
              width={28}
            />
          </span>
          <div className="min-w-0">
            {finished ? (
              <>
                <p className="font-semibold text-[var(--mm-gold)]">
                  Hoard claimed
                </p>
                <p className="text-sm text-[var(--mm-text-dim)]">
                  All {hunt.totalPoints} points banked.
                </p>
              </>
            ) : (
              <>
                <p className="font-[family-name:var(--font-display)] text-lg leading-none tracking-wide text-[var(--mm-gold)]">
                  {hunt.totalPoints} points
                </p>
                <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                  Clear all {hunt.steps.length} to claim the hoard.
                </p>
              </>
            )}
          </div>
        </li>
      </ol>

      <PlayerQuestActions questSlug={hunt.slug} />
    </div>
  );
}
