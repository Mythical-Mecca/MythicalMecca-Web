"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export interface Stand {
  id: string;
  /** What goes under the medallion. A locked stand still owns its title. */
  label: string;
  /** The stall number or hall — what the easy-mode list is for. */
  location: string | null;
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
 * A list answers "what is next"; a grid answers "what have I got" — and on a
 * free-order quest the second is the real question. It also fits a
 * twenty-stand trail on one screen, which neither the column of cards nor a
 * scrolling row managed.
 *
 * One medallion per *stand*, not per objective. The people running the event
 * think in vendors — "click on each clue and there are two tokens" — and a
 * grid with every vendor's face on it twice reads as forty errands instead
 * of twenty visits.
 *
 * Only the overview lives here. Every stand's detail — where it is, what it
 * pays, the forms and the scan instruction — is rendered on the server and
 * handed down in `details`, so the claim forms stay server actions and none
 * of that logic crosses into the browser.
 */
export function StandsCabinet({
  stands,
  details,
  initial,
  note,
  helpNote,
}: {
  stands: Stand[];
  /** Parallel to `stands`. Server-rendered; this only chooses which shows. */
  details: React.ReactNode[];
  initial: number;
  /** Whether the quest ranks its stands — the grid itself cannot say. */
  note: string;
  /** Where to go when stuck. Shown on the easy-mode list. */
  helpNote: string;
}) {
  const [picked, setPicked] = useState(initial);
  // Easy mode: the same stands as a plain list of names and stall numbers.
  // Some people walk a hall off a list, not a game board, and a phone held
  // up beside a floor map wants the words, not the faces.
  const [easy, setEasy] = useState(false);
  const current = stands[picked];

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-[0.16em] text-[var(--mm-gold)]">
          Stands
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
            {easy ? "Medallions" : "Easy mode"}
          </button>
        </div>
      </div>

      {easy ? (
        <EasyList stands={stands} helpNote={helpNote} />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6">
            {stands.map((s, i) => (
              <Medallion
                key={s.id}
                stand={s}
                selected={i === picked}
                onPick={() => setPicked(i)}
              />
            ))}
          </div>

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
            {details[picked]}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * The reference sheet: vendor name and stall number only. No tokens, no
 * progress chrome — a phone held beside a floor map just wants the words.
 */
function EasyList({
  stands,
  helpNote,
}: {
  stands: Stand[];
  helpNote: string;
}) {
  return (
    <div className="mt-3">
      <ul className="divide-y divide-[color-mix(in_srgb,var(--mm-divider)_75%,transparent)] overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--mm-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)]">
        {stands.map((s) => (
          <li key={s.id} className="min-w-0 px-4 py-3">
            <p className="truncate font-medium">{s.label}</p>
            {s.location ? (
              <p className="mt-0.5 text-sm text-[var(--mm-text-dim)]">
                {s.location}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
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

function Medallion({
  stand,
  selected,
  onPick,
}: {
  stand: Stand;
  selected: boolean;
  onPick: () => void;
}) {
  const done = stand.state === "done";
  const locked = stand.state === "locked";
  const partial = !done && stand.tokens.done > 0;

  // The ring carries the state; selection adds a second ring outside it, so
  // "which am I looking at" never has to compete with "have I cleared it".
  const ring = done
    ? "var(--mm-live)"
    : locked
      ? "color-mix(in srgb, var(--mm-divider) 90%, transparent)"
      : "var(--mm-gold)";

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-controls="stand-detail"
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <span className="relative">
        <span
          className="grid h-[78px] w-[78px] place-items-center overflow-hidden rounded-full transition"
          style={{
            background: done
              ? "linear-gradient(150deg, color-mix(in oklab, var(--mm-live) 14%, var(--mm-surface)), var(--mm-surface))"
              : locked
                ? "var(--mm-surface)"
                : "linear-gradient(150deg, color-mix(in oklab, var(--mm-gold) 18%, var(--mm-surface)), var(--mm-surface))",
            boxShadow: [
              `0 0 0 2px ${ring}`,
              selected
                ? `0 0 0 5px color-mix(in srgb, ${ring} 30%, transparent)`
                : "",
              !done && !locked
                ? "0 0 26px -6px color-mix(in srgb, var(--mm-gold) 75%, transparent)"
                : "",
            ]
              .filter(Boolean)
              .join(", "),
            opacity: locked ? 0.75 : 1,
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
              className="font-[family-name:var(--font-display)] text-[1.9rem]"
              style={{ color: done ? "var(--mm-live)" : "var(--mm-gold-hi)" }}
            >
              {stand.initial}
            </span>
          ) : (
            <Icon
              icon={locked ? "mdi:lock-outline" : stand.icon}
              width={27}
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
        className={`line-clamp-2 text-center text-[0.68rem] leading-tight ${
          locked ? "text-[var(--mm-text-dim)]" : "text-[var(--mm-text)]"
        }`}
      >
        {stand.label}
      </span>
    </button>
  );
}
