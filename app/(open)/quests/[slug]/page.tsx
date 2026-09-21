import Link from "next/link";
import { notFound } from "next/navigation";
import { claimantFor } from "@/lib/claimant";
import { BackLink } from "@/components/back-link";
import { parseReturn, withReturn, type ReturnTo } from "@/lib/return-to";
import { playerForEvent } from "@/lib/event-player";
import { PlayerSignIn } from "@/components/player-sign-in";
import {
  playerAcknowledgeSignup,
  playerDismissSignupReminder,
  playerSignOut,
} from "@/app/(open)/player-actions";
import {
  getHunt,
  prizeStanding,
  type HuntView,
  type PrizeTier,
  type PublicStep,
  type StepType,
} from "@/lib/hunts";
import type { SignupStep } from "@/lib/signup";
import { completeStep } from "@/app/(app)/quests/actions";
import { GeoStep } from "@/components/geo-step";
import { PhotoStep } from "@/components/photo-step";
import { PlayerQuestActions } from "@/components/player-quest-actions";
import { StandsCabinet } from "@/components/stands-cabinet";
import { Icon } from "@/components/icon";
import { inputPill } from "@/components/form";
import { pageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

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
 * The hoard.
 *
 * The hero is the prize rather than the place: what the quest is worth and
 * how much of it is already banked. A points total in a stat cell is a
 * number; the same total under a chest is a reason to cross a hall.
 *
 * Drawn rather than photographed — it has to hold up behind a gold numeral at
 * any width, it recolours with the tokens, and it weighs nothing on a hall's
 * wifi.
 */
function HoardCase({
  earned,
  total,
  left,
  finished,
  tiers,
}: {
  earned: number;
  total: number;
  /** Stands still to clear. */
  left: number;
  finished: boolean;
  tiers: PrizeTier[];
}) {
  // What the score is worth, and what the next one would be. The ladder is
  // the reason to keep walking after the first few stands, so it sits on the
  // hoard rather than in a footnote.
  const standing = tiers.length ? prizeStanding(tiers, earned) : null;
  return (
    <div className="relative mt-3 h-[172px] overflow-hidden rounded-[26px] bg-[linear-gradient(165deg,#22182c_0%,#14172c_55%,#0d1226_100%)] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8),0_0_0_1px_color-mix(in_srgb,var(--mm-gold)_40%,transparent),inset_0_1px_0_color-mix(in_srgb,white_10%,transparent)] sm:h-[210px]">
      <svg
        viewBox="56 72 246 118"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={finished ? "An open chest of coins" : "A chest of coins"}
      >
        <defs>
          <radialGradient id="mm-hoard-glow" cx="0.5" cy="0.72">
            <stop offset="0%" stopColor="#FFB13D" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#E18D01" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFB13D" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="179" cy="126" rx="150" ry="58" fill="url(#mm-hoard-glow)" />
        {/* The lid lifts once the trail is done — the one state change the
            scene carries, and the only one worth drawing twice. */}
        {finished ? (
          <path
            d="M104 116 Q179 62 254 90 L250 104 Q179 78 108 128 Z"
            fill="#6a4720"
          />
        ) : (
          <path
            d="M104 104 Q179 78 254 104 L254 116 Q179 92 104 116 Z"
            fill="#6a4720"
          />
        )}
        <path d="M104 150 L104 112 L254 112 L254 150 Z" fill="#4a3216" />
        <rect x="104" y="118" width="150" height="32" fill="#5a3a19" />
        <path
          d="M104 116 Q179 92 254 116"
          stroke="#9a6b32"
          strokeWidth="2.5"
          fill="none"
        />
        <rect x="168" y="112" width="22" height="26" rx="3" fill="#E18D01" />
        <circle cx="179" cy="126" r="4" fill="#160f0a" />
        <rect x="104" y="132" width="150" height="2" fill="#3a2611" opacity="0.7" />
        <g fill="#E18D01">
          <circle cx="96" cy="152" r="8" />
          <circle cx="118" cy="158" r="7" />
          <circle cx="142" cy="154" r="6" />
          <circle cx="238" cy="156" r="7" />
          <circle cx="262" cy="150" r="8" />
          <circle cx="214" cy="160" r="6" />
        </g>
        <g fill="#FFB13D" opacity="0.85">
          <circle cx="104" cy="148" r="4" />
          <circle cx="250" cy="146" r="4" />
          <circle cx="180" cy="160" r="5" />
        </g>
      </svg>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-[linear-gradient(to_top,rgba(11,15,28,0.97)_0%,rgba(11,15,28,0.88)_48%,transparent_100%)] px-4 pt-8 pb-3">
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
            The hoard
          </p>
          <p className="font-[family-name:var(--font-display)] text-[1.8rem] leading-none tabular-nums text-[var(--mm-gold)]">
            {earned}
            <span className="text-[0.55em] text-[var(--mm-text-dim)]">
              /{total}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right text-sm text-[var(--mm-text-dim)]">
          {standing ? (
            <>
              <p className="font-medium text-[var(--mm-text)]">
                {standing.entries === 0
                  ? "No entries yet"
                  : `${standing.entries} ${
                      standing.entries === 1 ? "entry" : "entries"
                    } in the draw`}
              </p>
              <p className="text-xs">
                {standing.next
                  ? `${standing.next.points} for ${standing.next.entries}`
                  : finished
                    ? "Top of the ladder"
                    : `${left} ${left === 1 ? "stand" : "stands"} to go`}
              </p>
            </>
          ) : (
            <p>
              {finished
                ? "Claimed"
                : `${left} ${left === 1 ? "stand" : "stands"} to go`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Who is playing, and how far in, on one line.
 *
 * The cabinet below wants the vertical room, so identity and progress share a
 * strip instead of taking a card each.
 */
function PlayerStrip({
  handle,
  path,
  earned,
  total,
}: {
  /** Null for a signed-in member — the site header already says who they are. */
  handle: string | null;
  path: string;
  earned: number;
  total: number;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-[color-mix(in_srgb,var(--mm-elevated)_80%,transparent)] px-3 py-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--mm-border)_55%,transparent)]">
      {handle ? (
        <form action={playerSignOut} className="flex min-w-0 items-center gap-2">
          <input type="hidden" name="path" value={path} />
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--mm-bg)] text-[var(--mm-gold)] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--mm-gold)_60%,transparent)]">
            <Icon icon="game-icons:hood" width={18} />
          </span>
          <span className="truncate font-[family-name:var(--font-display)] text-lg leading-none">
            {handle}
          </span>
          {/* At a no-data event this is the only way to hand the phone over. */}
          <button className="ml-1 min-h-8 shrink-0 text-xs text-[var(--mm-text-dim)] underline underline-offset-4 hover:text-[var(--mm-text)]">
            Not you?
          </button>
        </form>
      ) : (
        <span className="text-sm text-[var(--mm-text-dim)]">Your progress</span>
      )}
      <span className="shrink-0 font-[family-name:var(--font-display)] text-lg leading-none tabular-nums">
        {earned}
        <span className="text-[var(--mm-text-dim)]">/{total}</span>{" "}
        <span className="text-[0.62rem] tracking-[0.16em] text-[var(--mm-text-dim)]">
          PTS
        </span>
      </span>
    </div>
  );
}

/** The domain a link goes to, for "this opens X in a new tab". */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "another site";
  }
}

/**
 * The external sign-up step, before the trail.
 *
 * The form is the event's, not ours, and we cannot see whether it was sent —
 * so this asks, links, and takes the player's word. The tick is the whole
 * mechanism; the copy says plainly that the responsibility is theirs. Scans
 * at a stand still count while this is showing: the step is a request, not a
 * lock on the quest.
 */
function SignupGate({ signup, path }: { signup: SignupStep; path: string }) {
  return (
    <section
      aria-labelledby="signup-gate-title"
      className="mm-card mt-4 border-[var(--mm-gold)] p-5"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mm-gold)]">
        Before you start
      </p>
      <h2
        id="signup-gate-title"
        className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-wide"
      >
        {signup.label}
      </h2>
      {signup.blurb && (
        <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">{signup.blurb}</p>
      )}
      <a
        href={signup.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mm-btn mm-btn-primary mt-4 w-full justify-center py-3.5 text-base"
      >
        <Icon icon="mdi:open-in-new" width={18} />
        {signup.label}
      </a>
      <p className="mt-2 text-center text-xs text-[var(--mm-text-dim)]">
        Opens {hostOf(signup.url)}
        {" "}in a new tab. We can&apos;t see that form, so it&apos;s on you to
        send it — then come back here.
      </p>

      <form action={playerAcknowledgeSignup} className="mt-4 space-y-3">
        <input type="hidden" name="path" value={path} />
        <label className="mm-inset flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            name="done"
            value="1"
            required
            className="h-5 w-5 shrink-0 accent-[var(--mm-gold)]"
          />
          I&apos;ve filled it in
        </label>
        <button className="mm-btn mm-btn-ghost w-full justify-center py-3.5 text-base">
          Continue to the quest
          <Icon icon="mdi:chevron-right" width={18} />
        </button>
      </form>
    </section>
  );
}

/**
 * Shown once the trail is done, when nothing from the form's side has said
 * this handle signed up. Either they forgot, or the form never told us —
 * both are worth one more nudge, and neither is worth withholding the win.
 */
function SignupReminder({
  signup,
  path,
}: {
  signup: SignupStep;
  path: string;
}) {
  return (
    <div
      role="status"
      className="mm-card mt-4 border-[var(--mm-gold)] p-4 text-sm"
    >
      <p className="flex items-start gap-2">
        <Icon
          icon="mdi:clipboard-alert-outline"
          width={18}
          className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
        />
        <span>
          <span className="font-medium">One last thing.</span>
          {" "}We haven&apos;t heard from the event&apos;s sign-up form for
          your name yet. If you sent it, you&apos;re fine. If not, do it now —
          it&apos;s what makes the prize draw count.
        </span>
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <a
          href={signup.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mm-btn mm-btn-primary flex-1 justify-center text-sm"
        >
          <Icon icon="mdi:open-in-new" width={16} />
          {signup.label}
        </a>
        <form action={playerDismissSignupReminder} className="flex-1">
          <input type="hidden" name="path" value={path} />
          <button className="mm-btn mm-btn-ghost w-full justify-center text-sm">
            <Icon icon="mdi:check" width={16} />
            I&apos;ve already done this
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * One stand, opened.
 *
 * Everything a medallion cannot carry: where it is, what it pays, and the
 * control that claims it. Rendered on the server, so the claim forms stay
 * server actions and none of that logic crosses into the browser.
 */
function StandDetail({
  step,
  slug,
  flash,
  nested = false,
}: {
  step: PublicStep;
  slug: string;
  flash: { ok: boolean; fail: boolean };
  /**
   * One token of several at the same stand. The stand's own header already
   * said where it is, so the destination line is dropped and the title steps
   * down a size.
   */
  nested?: boolean;
}) {
  return (
    <div id={`step-${step.id}`}>
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`text-balance font-semibold leading-snug ${
            nested ? "text-base" : "text-[1.15rem]"
          }`}
        >
          {step.title}
        </h3>
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
      </div>

      {step.done ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--mm-live)]">
          <Icon icon="mdi:check-circle" width={15} className="shrink-0" />
          {/* The success flash has to live in THIS branch: by the time the
              redirect lands the step is already done. */}
          {flash.ok ? "Just cleared — nice one." : "Cleared"}
        </p>
      ) : step.locked ? (
        /* Locked: say what it is waiting for and stop there. No prompt, no
           destination, no claim control — showing the way to it would give
           away a clue the player hasn't earned. Refused server-side too. */
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)]">
          <Icon icon="mdi:lock-outline" width={14} className="shrink-0" />
          {step.lockedBy ? (
            <>
              Opens once{" "}
              <span className="text-[var(--mm-text)]">{step.lockedBy}</span> is
              cleared
            </>
          ) : (
            "Not open yet"
          )}
        </p>
      ) : (
        <>
          {!nested && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Destination step={step} />
            </div>
          )}
          {step.prompt && (
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
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
          <StepBody step={step} slug={slug} expanded />
        </>
      )}
    </div>
  );
}

/**
 * Objectives, folded into the stands they happen at.
 *
 * The data model is one row per objective and that is right — each token is
 * claimed, logged and refused on its own. But the person holding the phone
 * is looking for a vendor, and the vendor is one place with two things to do
 * there. So the page groups on the partner and shows each stand once, with
 * its tokens inside it.
 *
 * The key is the partner. An objective that names no partner (a riddle, a
 * photo drop) stands alone. Locked objectives group by the destination they
 * *would* reveal — the vendor is already on the board from its first token,
 * and hiding the second behind a separate padlock would just make the same
 * stand appear twice.
 */
interface StandGroup {
  key: string;
  /** Medallion title — clue titles stay until the destination is earned. */
  label: string;
  location: string | null;
  /** Easy-mode directory — vendor + stall even while the clue is unsolved. */
  vendor: string;
  stall: string | null;
  partnerSlug: string | null;
  logo: string | null;
  initial: string | null;
  icon: string;
  steps: PublicStep[];
}

function groupByStand(steps: PublicStep[]): StandGroup[] {
  const groups: StandGroup[] = [];
  const byKey = new Map<string, StandGroup>();
  for (const step of steps) {
    const d = step.destination;
    const dir = step.directory;
    // Group on the partner the objective *would* reveal, not only once the
    // clue is solved — otherwise Easy mode (and a half-cleared stand) lists
    // the same vendor once per token.
    const partnerSlug = d?.partnerSlug ?? dir?.partnerSlug ?? null;
    const key = partnerSlug ? `partner:${partnerSlug}` : `step:${step.id}`;
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        label: d?.partnerName ?? step.title,
        location: d?.locationHint ?? null,
        vendor: dir?.partnerName ?? d?.partnerName ?? step.title,
        stall: dir?.locationHint ?? d?.locationHint ?? null,
        partnerSlug,
        logo: null,
        initial: null,
        icon: STEP_ICON[step.type],
        steps: [],
      };
      byKey.set(key, g);
      groups.push(g);
    }
    g.steps.push(step);
    if (d?.partnerName) {
      g.label = d.partnerName;
      g.location = d.locationHint ?? g.location;
    }
    if (dir?.partnerName) g.vendor = dir.partnerName;
    if (dir?.locationHint) g.stall = dir.locationHint;
    // The face is shown as soon as any token at the stand is open — the
    // stand is on the board by then, and its logo is no longer a clue.
    if (!step.locked && d) {
      g.logo = g.logo ?? d.partnerLogo;
      g.initial =
        g.initial ?? (d.partnerName?.trim().charAt(0).toUpperCase() || null);
    }
  }
  return groups;
}

/** One stand, opened: where it is, then each token with its own control. */
function GroupDetail({
  group,
  slug,
  ok,
  fail,
}: {
  group: StandGroup;
  slug: string;
  ok: string | undefined;
  fail: string | undefined;
}) {
  const flashFor = (step: PublicStep) => ({
    ok: ok === step.id,
    fail: fail === step.id,
  });

  // A stand with one token is just that token — no header to introduce it.
  if (group.steps.length === 1) {
    const step = group.steps[0];
    return <StandDetail step={step} slug={slug} flash={flashFor(step)} />;
  }

  const banked = group.steps.filter((st) => st.done).length;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-balance text-[1.15rem] font-semibold leading-snug">
            {group.label}
          </h3>
          {group.location && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)]">
              <Icon icon="mdi:map-marker-outline" width={15} className="shrink-0" />
              {group.location}
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-[var(--mm-text-dim)]">
          {banked}/{group.steps.length} tokens
        </span>
      </div>
      {group.partnerSlug && (
        <Link
          href={`/partners/${group.partnerSlug}`}
          className="mt-1 inline-flex min-h-6 items-center gap-1 text-sm text-[var(--mm-gold)] hover:underline"
        >
          About this stand
          <Icon icon="mdi:chevron-right" width={14} />
        </Link>
      )}

      <ol className="mt-3 divide-y divide-[color-mix(in_srgb,var(--mm-divider)_75%,transparent)]">
        {group.steps.map((step, i) => (
          <li key={step.id} className="py-3 first:pt-0 last:pb-0">
            <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-[var(--mm-text-dim)]">
              Token {i + 1}
            </p>
            <StandDetail step={step} slug={slug} flash={flashFor(step)} nested />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The public view: what this is, how long it runs, whose event it belongs to. */
function QuestTeaser({
  hunt,
  backTo,
}: {
  hunt: HuntView;
  backTo: ReturnTo;
}) {
  return (
    <div>
      <SiteNav />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Back only when the visitor arrived from elsewhere on the site —
          a cold arrival from a shared link has nowhere to go back to. */}
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
              signupUrl={hunt.eventUrl}
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
                  ? "Check in at each stand as you go — the trail opens at the gathering."
                  : "This trail runs with the event. Come back when it is on."}
              </p>
            </>
          )}
        </div>
      </section>
      </div>
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
  const backTo = parseReturn(sp, { href: "/", label: "Home" });
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
      <QuestTeaser hunt={hunt} backTo={backTo} />
    );
  }

  // Only ever set at a no-data event, where there is no site header to sign
  // out from — <PlayerStrip> carries the sign-out instead.
  const player =
    who.kind === "player" ? await playerForEvent(hunt.eventId) : null;

  /**
   * Signed in, but not invited.
   *
   * Said here rather than left to the first check-in, because the alternative
   * is walking a hall to a stand and finding out at the counter. The stands
   * are withheld with it: this quest's objectives are not this reader's to
   * know, and the list is the whole point.
   */
  if (!hunt.allowed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="-ml-1 mb-4">
          <BackLink to={backTo} />
        </div>
        <div className="mm-card p-6 text-center">
          <Icon
            icon="mdi:account-lock-outline"
            width={34}
            className="mx-auto text-[var(--mm-gold)]"
          />
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            {hunt.title}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[var(--mm-text-dim)]">
            This one is invite-only, and{" "}
            {player ? `"${player.handle}"` : "your account"} isn&apos;t on the
            list. Whoever is running it can add you.
          </p>
          {player && (
            <form action={playerSignOut} className="mt-5">
              <input
                type="hidden"
                name="path"
                value={`/quests/${hunt.slug}`}
              />
              <button className="mm-btn mm-btn-ghost">
                <Icon icon="game-icons:hood" width={17} />
                Sign in as someone else
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const groups = groupByStand(hunt.steps);
  const standsLeft =
    groups.filter((g) => !g.steps.every((st) => st.done)).length +
    hunt.hiddenRemaining;
  // Which medallion the cabinet opens on: whatever the player just tried,
  // else the first stand with something still to do. Not a ranking — a
  // starting point.
  const openIndex = Math.max(
    0,
    groups.findIndex((g) =>
      ok || fail
        ? g.steps.some((st) => st.id === (ok ?? fail))
        : g.steps.some((st) => !st.done && !st.locked)
    )
  );
  // Grand total includes hidden extras; finished only when those are banked too.
  const finished =
    hunt.totalPoints > 0 && hunt.earnedPoints === hunt.totalPoints;

  // The external sign-up step. Until they tick it (or the form's side tells
  // us they did it), the trail waits behind the card — but a scan at a stand
  // still lands, so nobody loses a check-in to a box they hadn't found yet.
  const signup = hunt.signup;
  const gated = !!signup && !signup.confirmed && !signup.acknowledged;

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">

      <div className="-ml-1 px-1">
        <BackLink to={backTo} />
      </div>

      <HoardCase
        earned={hunt.earnedPoints}
        total={hunt.totalPoints}
        left={standsLeft}
        finished={finished}
        tiers={hunt.prizeTiers}
      />

      <header className="mt-3">
        {hunt.eventSlug && (
          <Link
            href={withReturn(`/events/${hunt.eventSlug}`, {
              href: `/quests/${hunt.slug}`,
              label: hunt.title,
            })}
            className="inline-flex min-h-6 items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-[var(--mm-gold)] hover:underline"
          >
            <Icon icon="game-icons:campfire" width={14} />
            {hunt.eventTitle}
          </Link>
        )}
        <h1 className="mt-1 text-balance font-[family-name:var(--font-display)] text-2xl leading-tight tracking-wide sm:text-3xl">
          {hunt.title}
        </h1>
        {hunt.description && (
          <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">
            {hunt.description}
          </p>
        )}
      </header>

      <PlayerStrip
        handle={player?.handle ?? null}
        path={`/quests/${hunt.slug}`}
        earned={hunt.earnedPoints}
        total={hunt.totalPoints}
      />

      {signup?.confirmed && (
        <p className="mt-3 flex items-center gap-1.5 px-1 text-xs text-[var(--mm-live)]">
          <Icon icon="mdi:check-decagram" width={14} className="shrink-0" />
          Signed up with the event — thanks.
        </p>
      )}

      {gated ? (
        <SignupGate signup={signup} path={`/quests/${hunt.slug}`} />
      ) : (
        <>
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

      {finished && (
        <p className="mt-4 flex items-center gap-2 rounded-[20px] border border-[color-mix(in_srgb,var(--mm-live)_45%,transparent)] bg-[color-mix(in_srgb,var(--mm-live)_10%,transparent)] p-4 font-medium text-[var(--mm-live)]">
          <Icon icon="game-icons:laurels-trophy" width={20} className="shrink-0" />
          Every stand visited — all {hunt.totalPoints} points banked.
        </p>
      )}

      {finished && signup && !signup.confirmed && !signup.reminderDismissed && (
        <SignupReminder signup={signup} path={`/quests/${hunt.slug}`} />
      )}

      <StandsCabinet
        note={hunt.sequential ? "In order" : "Any order"}
        helpNote="Stuck, or a code that won't take? Find the Mythical Mecca stand and ask — we're around all day."
        initial={openIndex}
        hiddenRemaining={hunt.hiddenRemaining}
        stands={groups.map((g) => {
          const done = g.steps.filter((st) => st.done).length;
          const allLocked = g.steps.every((st) => st.locked);
          return {
            id: g.key,
            label: g.label,
            location: g.location,
            vendor: g.vendor,
            stall: g.stall,
            state:
              done === g.steps.length
                ? ("done" as const)
                : allLocked
                  ? ("locked" as const)
                  : ("open" as const),
            points: g.steps.reduce((a, st) => a + st.points, 0),
            tokens: { done, total: g.steps.length },
            logo: allLocked ? null : g.logo,
            initial: allLocked ? null : g.initial,
            icon: g.icon,
          };
        })}
        details={groups.map((g) => (
          <GroupDetail key={g.key} group={g} slug={slug} ok={ok} fail={fail} />
        ))}
      />

      <PlayerQuestActions questSlug={hunt.slug} />
        </>
      )}
    </div>
  );
}
