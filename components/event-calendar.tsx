"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";

export type CalEvent = {
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dayKey(y: number, m: number, d: number) {
  return `${y}-${m}-${d}`;
}

/** The little gold event chip inside a day cell. */
const pillClass =
  "truncate rounded-md bg-[color-mix(in_srgb,var(--mm-gold)_18%,transparent)] px-1.5 py-0.5 text-[10px] leading-tight text-[var(--mm-gold)]";

export function EventCalendar({
  events,
  todayIso,
  linkEvents = true,
}: {
  events: CalEvent[];
  todayIso: string;
  /**
   * Event pills link to the event page by default. The public homepage renders
   * the calendar read-only — those pages are members-only, so a link there
   * would just bounce a visitor to /login.
   */
  linkEvents?: boolean;
}) {
  const today = useMemo(() => new Date(todayIso), [todayIso]);
  const [cursor, setCursor] = useState(() => ({
    y: today.getFullYear(),
    m: today.getMonth(),
  }));

  // Map each calendar day to the events that fall on it (multi-day events span).
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const s = new Date(e.startsAt);
      const en = new Date(e.endsAt);
      const d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const end = new Date(en.getFullYear(), en.getMonth(), en.getDate());
      let guard = 0;
      while (d <= end && guard < 90) {
        const key = dayKey(d.getFullYear(), d.getMonth(), d.getDate());
        const arr = map.get(key) ?? [];
        arr.push(e);
        map.set(key, arr);
        d.setDate(d.getDate() + 1);
        guard++;
      }
    }
    return map;
  }, [events]);

  const { y, m } = cursor;

  const cells = useMemo(() => {
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [y, m]);

  const monthCount = useMemo(() => {
    let n = 0;
    for (const [key, list] of eventsByDay) {
      const [ky, km] = key.split("-").map(Number);
      if (ky === y && km === m) n += list.length;
    }
    return n;
  }, [eventsByDay, y, m]);

  const isToday = (d: number) =>
    today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;

  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const goToday = () =>
    setCursor({ y: today.getFullYear(), m: today.getMonth() });

  return (
    <div className="mm-glass relative overflow-hidden p-5 md:p-7">
      {/* mystical glow flourishes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--mm-gold), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--mm-blue), transparent 70%)" }}
      />

      {/* Header */}
      <div className="relative mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon
            icon="game-icons:moon"
            width={20}
            className="text-[var(--mm-gold)]"
          />
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide md:text-2xl">
              {MONTHS[m]}{" "}
              <span className="mm-gradient-text">{y}</span>
            </h3>
            <p className="text-[11px] uppercase tracking-widest text-[var(--mm-text-dim)]">
              {monthCount === 0
                ? "No gatherings this moon"
                : `${monthCount} gathering${monthCount > 1 ? "s" : ""} this moon`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-full border border-[var(--mm-border)] px-3 py-1 text-xs text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-[var(--mm-text)]"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => move(-1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--mm-border)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-[var(--mm-gold)]"
          >
            <Icon icon="mdi:chevron-left" width={18} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => move(1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--mm-border)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-[var(--mm-gold)]"
          >
            <Icon icon="mdi:chevron-right" width={18} />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="relative mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-medium uppercase tracking-widest text-[var(--mm-text-dim)]"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="relative grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="min-h-16 sm:min-h-20" />;
          const dayEvents = eventsByDay.get(dayKey(y, m, d)) ?? [];
          const has = dayEvents.length > 0;
          const todayCell = isToday(d);
          return (
            <div
              key={d}
              className={[
                "group/cell relative flex min-h-16 flex-col rounded-xl border p-1.5 transition sm:min-h-20",
                has
                  ? "border-[color-mix(in_srgb,var(--mm-gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)] shadow-[0_0_16px_-6px_var(--mm-gold)]"
                  : "border-[color-mix(in_srgb,var(--mm-border)_55%,transparent)]",
                todayCell ? "ring-2 ring-[var(--mm-blue)]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "mb-1 inline-flex h-5 w-5 items-center justify-center self-start rounded-full font-[family-name:var(--font-display)] text-xs",
                  todayCell
                    ? "bg-[var(--mm-blue)] text-[#08101e]"
                    : has
                      ? "text-[var(--mm-gold)]"
                      : "text-[var(--mm-text-dim)]",
                ].join(" ")}
              >
                {d}
              </span>

              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) =>
                  linkEvents ? (
                    <Link
                      key={e.slug}
                      href={`/events/${e.slug}`}
                      title={e.title}
                      className={`${pillClass} transition hover:bg-[color-mix(in_srgb,var(--mm-gold)_32%,transparent)]`}
                    >
                      {e.title}
                    </Link>
                  ) : (
                    <span key={e.slug} title={e.title} className={pillClass}>
                      {e.title}
                    </span>
                  )
                )}
                {dayEvents.length > 2 && (
                  <span className="px-1 text-[10px] text-[var(--mm-text-dim)]">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
