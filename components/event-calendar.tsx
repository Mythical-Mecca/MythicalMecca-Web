"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { trapTab } from "@/lib/focus-trap";
import { withReturn, type ReturnTo } from "@/lib/return-to";

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
  headingLevel = "h2",
  returnTo,
}: {
  events: CalEvent[];
  todayIso: string;
  /** Where the calendar is being shown, so an event can offer a way back. */
  returnTo?: ReturnTo;
  /**
   * The month title's rank. It is the calendar's own heading, so it has to sit
   * one level below whatever heading introduces the calendar — h2 inside a page
   * that leads with an h1, h3 inside a section of the public one-pager. It was
   * hard-coded to h3 and produced an h1 -> h3 skip on /events.
   */
  headingLevel?: "h2" | "h3";
}) {
  const MonthHeading = headingLevel;
  /** The day whose sheet is open, as a `dayKey`. */
  const [openDay, setOpenDay] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
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

  // The sheet is a real modal: Escape closes it, Tab stays inside it, the page
  // behind it doesn't scroll, and focus lands on the panel when it opens.
  useEffect(() => {
    if (!openDay) return;
    const panel = sheetRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDay(null);
        return;
      }
      if (panel) trapTab(panel, e);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openDay]);

  const openEvents = openDay ? (eventsByDay.get(openDay) ?? []) : [];
  const openLabel = (() => {
    if (!openDay) return "";
    const [dy, dm, dd] = openDay.split("-").map(Number);
    return `${dd} ${MONTHS[dm]} ${dy}`;
  })();

  const openDaySheet = openDay && (
    <div
      className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4"
      onClick={() => setOpenDay(null)}
    >
      <div className="mm-fade absolute inset-0 bg-black/60" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Gatherings on ${openLabel}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="mm-pop relative flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[color-mix(in_srgb,var(--mm-gold)_28%,transparent)] bg-[var(--mm-surface)] shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--mm-divider)] px-5 py-4">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {openLabel}
            </p>
            <p className="text-xs text-[var(--mm-text-dim)]">
              {openEvents.length} gathering{openEvents.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenDay(null)}
            aria-label="Close day"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:close" width={20} />
          </button>
        </div>

        <ul className="mm-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {openEvents.map((e) => {
            const body = (
              <>
                <span className="block font-[family-name:var(--font-display)] leading-tight">
                  {e.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--mm-text-dim)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="mdi:clock-outline" width={13} />
                    {new Date(e.startsAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {e.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="mdi:map-marker-outline" width={13} />
                      {e.location}
                    </span>
                  )}
                </span>
              </>
            );
            return (
              <li key={e.slug}>
                <Link
                  href={withReturn(`/events/${e.slug}`, returnTo)}
                  onClick={() => setOpenDay(null)}
                  className="flex items-center justify-between gap-3 rounded-xl p-3 transition hover:bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)]"
                >
                  <span className="min-w-0">{body}</span>
                  <Icon
                    icon="mdi:chevron-right"
                    width={18}
                    className="shrink-0 text-[var(--mm-gold)]"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

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
            <MonthHeading className="font-[family-name:var(--font-display)] text-xl tracking-wide md:text-2xl">
              {MONTHS[m]}{" "}
              <span className="mm-gradient-text">{y}</span>
            </MonthHeading>
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
            aria-label="Previous month"
            onClick={() => move(-1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--mm-border)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-[var(--mm-gold)]"
          >
            <Icon icon="mdi:chevron-left" width={18} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => move(1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--mm-border)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-[var(--mm-gold)]"
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

      {/* Day grid.

          Every day that has something on is one <button> covering the whole
          cell, and it opens a sheet listing that day's events in full.

          Before, the only target was the little gold pill inside the cell —
          19x17px on a 375px phone, truncated to about one character, with the
          real title only in a `title` attribute that touch never fires. A third
          or later event on the same day was unreachable altogether: "+2 more"
          was plain text. The pills stay as the visual cue and are hidden from
          assistive tech, since the button's own label already says what the day
          holds. */}
      <div className="relative grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="min-h-16 sm:min-h-20" />;
          const key = dayKey(y, m, d);
          const dayEvents = eventsByDay.get(key) ?? [];
          const has = dayEvents.length > 0;
          const todayCell = isToday(d);

          const inner = (
            <>
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

              <span
                aria-hidden
                className="flex flex-1 flex-col gap-0.5 overflow-hidden"
              >
                {dayEvents.slice(0, 2).map((e) => (
                  <span key={e.slug} className={pillClass}>
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="px-1 text-[10px] text-[var(--mm-text-dim)]">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </span>
            </>
          );

          const cellCls = [
            "group/cell relative flex min-h-16 flex-col rounded-xl border p-1.5 text-left transition sm:min-h-20",
            has
              ? "border-[color-mix(in_srgb,var(--mm-gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)] shadow-[0_0_16px_-6px_var(--mm-gold)]"
              : "border-[color-mix(in_srgb,var(--mm-divider)_70%,transparent)]",
            todayCell ? "ring-2 ring-[var(--mm-blue)]" : "",
          ].join(" ");

          if (!has) {
            return (
              <div key={d} className={cellCls}>
                {inner}
              </div>
            );
          }

          return (
            <button
              key={d}
              type="button"
              onClick={() => setOpenDay(key)}
              aria-haspopup="dialog"
              // The visible cell is a number and a couple of clipped pills, so
              // the label has to carry the date and the count itself.
              aria-label={`${d} ${MONTHS[m]} ${y}, ${dayEvents.length} gathering${
                dayEvents.length === 1 ? "" : "s"
              }`}
              className={`${cellCls} hover:border-[var(--mm-gold)] hover:bg-[color-mix(in_srgb,var(--mm-gold)_14%,transparent)]`}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {/* Day sheet — the full list for one day, with room for titles, times,
          locations and every event rather than the first two. */}
      {openDaySheet}
    </div>
  );
}
