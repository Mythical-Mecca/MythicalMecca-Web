"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

export interface Stand {
  id: string;
  /** What goes under the medallion. A locked stand still owns its title. */
  label: string;
  /** Revealed stall — only once the clue has been earned. */
  location: string | null;
  /** Easy-mode directory name — vendor even while the clue is unsolved. */
  vendor: string;
  /** Easy-mode stall / hall — always shown in the list. */
  stall: string | null;
  state: "done" | "open" | "locked";
  /** Everything this stand pays, across all its tokens. */
  points: number;
  /**
   * The tokens on offer at this stand and how many are banked. A vendor
   * quest pays two — one for talking to them, one for buying — and the
   * medallion has to say "one of two" rather than pretending the stand is
   * either done or not.
   */
  tokens: { done: number; total: number };
  /**
   * The face. Both are null for a locked stand — its destination is a clue
   * that hasn't been earned, and a picture of the shopfront is the answer.
   */
  logo: string | null;
  initial: string | null;
  /** Shown when there is no face: one glyph per kind of task. */
  icon: string;
}

/**
 * The stands, as a cabinet of medallions.
 *
 * A wrapping grid used to answer "what have I got", but a twenty-stand trail
 * ate the page before the player reached the stand they had open. One
 * scrolling row keeps the collection in view and leaves the vertical room
 * for the detail — pick a face, read what to do there.
 *
 * One medallion per *stand*, not per objective. The people running the event
 * think in vendors — "click on each clue and there are two tokens" — and a
 * face for every token twice over reads as forty errands instead of twenty
 * visits.
 *
 * Only the overview lives here. Every stand's detail — where it is, what it
 * pays, the forms and the scan instruction — is rendered on the server and
 * handed down in `details`, so the claim forms stay server actions and none
 * of that logic crosses into the browser.
 */
export function StandsCabinet({
  questSlug,
  sequential,
  stands,
  details,
  initial,
  explicitInitial,
  note,
  helpNote,
  hiddenRemaining = 0,
  easyModeHtml,
}: {
  questSlug: string;
  sequential: boolean;
  stands: Stand[];
  /** Parallel to `stands`. Server-rendered; this only chooses which shows. */
  details: React.ReactNode[];
  initial: number;
  explicitInitial?: boolean;
  /** Whether the quest ranks its stands — the grid itself cannot say. */
  note: string;
  /** Where to go when stuck. Shown on the easy-mode list. */
  helpNote: string;
  /** Locked extras still off the board — empty ? slots, Steam-style. */
  hiddenRemaining?: number;
  /** Authored Easy-mode directory. When set, replaces the auto vendor list. */
  easyModeHtml?: string;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Easy mode: the same stands as a plain list of names and stall numbers.
  // Some people walk a hall off a list, not a game board, and a phone held
  // up beside a floor map wants the words, not the faces.
  const [easy, setEasy] = useState(false);
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sequential) {
      setWeights(null);
      return;
    }
    const key = `quest-weights-${questSlug}`;
    const stored = sessionStorage.getItem(key);
    let currentWeights: Record<string, number> = {};
    if (stored) {
      try {
        currentWeights = JSON.parse(stored);
      } catch (e) {
        // ignore error
      }
    }
    let updated = false;
    for (const stand of stands) {
      if (!(stand.id in currentWeights) && stand.state !== "locked") {
        currentWeights[stand.id] = Math.random();
        updated = true;
      }
    }
    if (updated) {
      sessionStorage.setItem(key, JSON.stringify(currentWeights));
    }
    setWeights(currentWeights);
  }, [questSlug, sequential, stands]);

  let displayStands = stands;
  let displayDetails = details;
  if (weights) {
    const zipped = stands.map((s, i) => {
      const isLocked = s.state === "locked";
      const w = isLocked ? 1000 + i : (weights[s.id] ?? i);
      return { s, d: details[i], w };
    });
    zipped.sort((a, b) => a.w - b.w);
    displayStands = zipped.map(x => x.s);
    displayDetails = zipped.map(x => x.d);
  }

  let activeId = pickedId;
  if (!activeId) {
    if (explicitInitial) {
      activeId = stands[initial]?.id;
    } else {
      activeId = displayStands.find(s => s.state === "open")?.id ?? displayStands[0]?.id;
    }
  }

  const foundIndex = activeId ? displayStands.findIndex(s => s.id === activeId) : -1;
  const displayPickedIndex = foundIndex >= 0 ? foundIndex : initial;
  const current = displayStands[displayPickedIndex];

  return (
    <section className={`mt-5 transition-opacity duration-300 ${!mounted && !sequential ? "opacity-0" : "opacity-100"}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-[0.16em] text-[var(--mm-gold)]">
          Quests
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--mm-text-dim)]">{note}</span>
          <button
            type="button"
            onClick={() => setEasy((e) => !e)}
            aria-pressed={easy}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--mm-border)] px-3 py-1 text-xs text-[var(--mm-text-dim)] transition-colors hover:border-[var(--mm-gold)] hover:text-[var(--mm-text)] aria-pressed:border-[var(--mm-gold)] aria-pressed:text-[var(--mm-text)]"
          >
            <Icon
              icon={easy ? "mdi:view-grid-outline" : "mdi:format-list-bulleted"}
              width={14}
            />
            {easy ? "Medallions" : "Easy mode?"}
          </button>
        </div>
      </div>

      {easy ? (
        <EasyList
          stands={displayStands}
          helpNote={helpNote}
          html={easyModeHtml}
        />
      ) : (
        <>
          <MedallionRail
            stands={displayStands}
            hiddenRemaining={hiddenRemaining}
            picked={displayPickedIndex}
            onPick={(i) => setPickedId(displayStands[i].id)}
          />

          {/* The detail for whichever medallion is open. aria-live so a
              screen reader hears the panel change rather than being left on
              the button. */}
          <div
            id="stand-detail"
            aria-live="polite"
            className="mt-5 rounded-[20px] border p-4 transition"
            style={{
              borderColor:
                current?.state === "done"
                  ? "color-mix(in srgb, var(--mm-live) 45%, transparent)"
                  : current?.state === "locked"
                    ? "color-mix(in srgb, var(--mm-divider) 90%, transparent)"
                    : "color-mix(in srgb, var(--mm-gold) 70%, transparent)",
              background:
                "color-mix(in srgb, var(--mm-surface) 92%, transparent)",
              boxShadow:
                "inset 0 1px 0 color-mix(in srgb, white 7%, transparent)",
            }}
          >
            {displayDetails[displayPickedIndex]}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * One snapping row of faces. The selected coin is scrolled into the middle
 * so a long trail never leaves "the one I am looking at" off the edge.
 */
function MedallionRail({
  stands,
  hiddenRemaining,
  picked,
  onPick,
}: {
  stands: Stand[];
  hiddenRemaining: number;
  picked: number;
  onPick: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `[data-stand-index="${picked}"]`
    );
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = el.offsetLeft - root.clientWidth / 2 + el.clientWidth / 2;
    root.scrollTo({
      left,
      behavior: reduce ? "instant" : "smooth",
    });
  }, [picked]);

  return (
    <div
      ref={scroller}
      className="mm-scroll mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 py-2"
    >
      {stands.map((s, i) => (
        <Medallion
          key={s.id}
          stand={s}
          selected={i === picked}
          onPick={() => onPick(i)}
          index={i}
        />
      ))}
      {Array.from({ length: hiddenRemaining }, (_, i) => (
        <SecretMedallion key={`secret-${i}`} />
      ))}
    </div>
  );
}

/**
 * The reference sheet. Prefer authored Easy-mode HTML when the organiser
 * wrote one; otherwise fall back to vendor name + stall from each stand.
 */
function EasyList({
  stands,
  helpNote,
  html,
}: {
  stands: Stand[];
  helpNote: string;
  html?: string;
}) {
  return (
    <div className="mt-3">
      {html ? (
        <div
          className="overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--mm-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)] px-4 py-3 text-[var(--mm-text)] [&_a]:text-[var(--mm-gold)] [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--mm-divider)_75%,transparent)] overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--mm-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)]">
          {stands.map((s) => (
            <li key={s.id} className="min-w-0 px-4 py-3">
              <p className="truncate font-medium">{s.vendor}</p>
              {s.stall ? (
                <p className="mt-0.5 text-sm text-[var(--mm-text-dim)]">
                  {s.stall}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-start gap-2 text-sm text-[var(--mm-text-dim)]">
        <Icon
          icon="mdi:hand-wave-outline"
          width={16}
          className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
        />
        {helpNote}
      </p>
    </div>
  );
}

/**
 * A hidden extra that is not on the board yet. Dashed and empty — same idea
 * as a locked Steam achievement: you can see that a slot exists, nothing else.
 */
function SecretMedallion() {
  return (
    <div
      className="flex w-[4.25rem] shrink-0 snap-center flex-col items-center gap-1"
      aria-label="Hidden stand"
    >
      <span
        className="grid h-[64px] w-[64px] place-items-center rounded-full"
        style={{
          background: "transparent",
          border: "2px dashed color-mix(in srgb, var(--mm-divider) 85%, transparent)",
          color: "color-mix(in srgb, var(--mm-text-dim) 70%, transparent)",
        }}
      >
        <span className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none">
          ?
        </span>
      </span>
      <span className="w-full truncate text-center text-[0.68rem] leading-tight text-[var(--mm-text-dim)]">
        Hidden
      </span>
    </div>
  );
}

function Medallion({
  stand,
  selected,
  onPick,
  index,
}: {
  stand: Stand;
  selected: boolean;
  onPick: () => void;
  index: number;
}) {
  const done = stand.state === "done";
  const locked = stand.state === "locked";
  const partial = !done && stand.tokens.done > 0;

  // Selected reads as the open page; everything else steps back. Done stays
  // green either way so "cleared" never has to compete with "looking at".
  const ring = done
    ? "var(--mm-live)"
    : locked
      ? "color-mix(in srgb, var(--mm-divider) 70%, transparent)"
      : "var(--mm-gold)";

  const ringWidth = selected ? 3 : done ? 2 : 1.5;

  return (
    <button
      type="button"
      onClick={onPick}
      data-stand-index={index}
      aria-pressed={selected}
      aria-controls="stand-detail"
      title={stand.label}
      className="group flex w-[4.25rem] shrink-0 snap-center flex-col items-center gap-1 focus:outline-none"
    >
      <span
        className="relative transition-transform duration-200"
        style={{
          transform: selected ? "scale(1.08)" : "scale(1)",
        }}
      >
        <span
          className="grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-full transition-[box-shadow,opacity,filter] duration-200"
          style={{
            background: done
              ? "linear-gradient(150deg, color-mix(in oklab, var(--mm-live) 22%, var(--mm-surface)), var(--mm-surface))"
              : locked
                ? "var(--mm-surface)"
                : selected
                  ? "linear-gradient(150deg, color-mix(in oklab, var(--mm-gold) 28%, var(--mm-surface)), var(--mm-surface))"
                  : "linear-gradient(150deg, color-mix(in oklab, var(--mm-gold) 10%, var(--mm-surface)), var(--mm-surface))",
            boxShadow: [
              `0 0 0 ${ringWidth}px ${ring}`,
              selected
                ? done
                  ? "0 0 0 7px color-mix(in srgb, var(--mm-live) 35%, transparent), 0 0 28px -4px color-mix(in srgb, var(--mm-live) 55%, transparent)"
                  : "0 0 0 7px color-mix(in srgb, var(--mm-gold) 40%, transparent), 0 0 32px -4px color-mix(in srgb, var(--mm-gold) 70%, transparent)"
                : done
                  ? "0 0 14px -6px color-mix(in srgb, var(--mm-live) 45%, transparent)"
                  : "",
            ]
              .filter(Boolean)
              .join(", "),
            opacity: selected ? 1 : done ? 0.72 : locked ? 0.55 : 0.62,
            filter:
              !selected && done
                ? "saturate(0.75)"
                : !selected && !locked
                  ? "saturate(0.85) brightness(0.92)"
                  : "none",
          }}
        >
          {stand.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={stand.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : stand.initial ? (
            <span
              className="font-[family-name:var(--font-display)] text-[1.55rem]"
              style={{ color: done ? "var(--mm-live)" : "var(--mm-gold-hi)" }}
            >
              {stand.initial}
            </span>
          ) : (
            <Icon
              icon={locked ? "mdi:lock-outline" : stand.icon}
              width={24}
              className={
                locked ? "text-[var(--mm-text-dim)]" : "text-[var(--mm-gold)]"
              }
            />
          )}
        </span>

        {/* Cleared gets a tick. A stand that pays more than one token wears
            its count — "1/2" is the whole story of a half-visited vendor.
            A single-token stand wears its price, as before. */}
        {done ? (
          <span className="absolute right-0 bottom-0 grid h-6 w-6 place-items-center rounded-full bg-[var(--mm-live)] text-[#070b1e] ring-[3px] ring-[var(--mm-bg)]">
            <Icon icon="mdi:check" width={14} />
          </span>
        ) : locked ? null : stand.tokens.total > 1 ? (
          <span
            className="absolute -right-1 bottom-0 grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ring-[3px] ring-[var(--mm-bg)]"
            style={{
              background: partial ? "var(--mm-gold)" : "var(--mm-elevated)",
              color: partial ? "#160f0a" : "var(--mm-text-dim)",
            }}
          >
            {stand.tokens.done}/{stand.tokens.total}
          </span>
        ) : (
          <span className="absolute -right-1 bottom-0 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--mm-gold)] px-1.5 text-[11px] font-bold tabular-nums text-[#160f0a] ring-[3px] ring-[var(--mm-bg)]">
            {stand.points}
          </span>
        )}
      </span>

      <span
        className={`w-full truncate text-center text-[0.68rem] leading-tight transition-colors ${
          selected
            ? done
              ? "font-medium text-[var(--mm-live)]"
              : "font-medium text-[var(--mm-text)]"
            : done
              ? "text-[var(--mm-text-dim)]"
              : locked
                ? "text-[var(--mm-text-dim)]"
                : "text-[var(--mm-text-dim)]"
        }`}
      >
        {stand.label}
      </span>
    </button>
  );
}
