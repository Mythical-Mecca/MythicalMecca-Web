"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export interface Stand {
  id: string;
  /** What goes under the medallion. A locked stand still owns its title. */
  label: string;
  state: "done" | "open" | "locked";
  points: number;
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
 * free-order quest the second is the real question. It also fits a ten-stand
 * trail on one screen, which neither the column of cards nor a scrolling row
 * managed.
 *
 * Only the overview lives here. Every stand's detail — where it is, what it
 * pays, the form or the scan instruction — is rendered on the server and
 * handed down in `details`, so the claim forms stay server actions and none
 * of that logic crosses into the browser.
 */
export function StandsCabinet({
  stands,
  details,
  initial,
  note,
}: {
  stands: Stand[];
  /** Parallel to `stands`. Server-rendered; this only chooses which shows. */
  details: React.ReactNode[];
  initial: number;
  /** Whether the quest ranks its stands — the grid itself cannot say. */
  note: string;
}) {
  const [picked, setPicked] = useState(initial);
  const current = stands[picked];

  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-[0.16em] text-[var(--mm-gold)]">
          Stands
        </h2>
        <span className="text-sm text-[var(--mm-text-dim)]">{note}</span>
      </div>

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

      {/* The detail for whichever medallion is open. aria-live so a screen
          reader hears the panel change rather than being left on the button. */}
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
          boxShadow: "inset 0 1px 0 color-mix(in srgb, white 7%, transparent)",
        }}
      >
        {details[picked]}
      </div>
    </section>
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

        {/* Cleared gets a tick; anything still open wears its price. */}
        {done ? (
          <span className="absolute right-0 bottom-0 grid h-6 w-6 place-items-center rounded-full bg-[var(--mm-live)] text-[#070b1e] ring-[3px] ring-[var(--mm-bg)]">
            <Icon icon="mdi:check" width={14} />
          </span>
        ) : locked ? null : (
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
