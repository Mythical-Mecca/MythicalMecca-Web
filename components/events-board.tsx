"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { Drawer } from "./drawer";
import { LocationField } from "./location-field";
import { EventSchedule } from "./event-schedule";
import { TextField, TextareaField, FormSection, PageHeader } from "./form";
import { ImageUploader } from "./image-uploader";
import { createEvent } from "@/app/(admin)/actions";

type Ev = {
  slug: string;
  title: string;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function NewEventForm() {
  const [state, formAction, pending] = useActionState(createEvent, {});
  const [titleOk, setTitleOk] = useState(false);
  const [sched, setSched] = useState({ startsAt: "", endsAt: "" });

  const valid = titleOk && sched.startsAt !== "" && sched.endsAt !== "";

  return (
    <form action={formAction} className="space-y-5">
      <TextField
        name="title"
        label="Title"
        icon="mdi:format-title"
        required
        placeholder="Event name"
        onChange={(e) => setTitleOk(e.currentTarget.value.trim().length >= 2)}
      />
      <TextField
        name="summary"
        label="Summary"
        hint="optional"
        icon="mdi:text-short"
        description="A one-line teaser shown in listings."
        placeholder="One-liner"
      />
      <LocationField />
      <FormSection title="When" icon="mdi:calendar-clock">
        <EventSchedule onChange={setSched} />
      </FormSection>
      <TextareaField
        name="bodyMd"
        label="Details"
        hint="optional"
        icon="mdi:text-long"
        rows={4}
        placeholder="What's happening…"
      />

      <FormSection title="Gallery" icon="mdi:image-multiple-outline">
        <ImageUploader
          name="eventImages"
          entityType="event_gallery"
          maxFiles={12}
          accent="#5cc08c"
          label="Event photos"
          description="Optional · shown on the public event page"
        />
      </FormSection>

      {state.error && (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-[var(--mm-danger)] bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] px-4 py-2.5 text-sm text-[var(--mm-danger)]"
        >
          <Icon icon="mdi:alert-circle-outline" width={16} />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || pending}
        className="mm-btn mm-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <Icon icon="mdi:calendar-plus" width={16} />{" "}
        {pending ? "Scheduling…" : "Schedule event"}
      </button>
    </form>
  );
}

export function EventsBoard({ events }: { events: Ev[] }) {
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const dated = useMemo(
    () =>
      events
        .filter((e) => e.startsAt)
        .map((e) => ({
          ...e,
          s: new Date(e.startsAt as string).getTime(),
          en: new Date((e.endsAt ?? e.startsAt) as string).getTime(),
        })),
    [events]
  );

  const cells = useMemo(() => {
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const eventsOnDay = (d: number) => {
    const dayStart = new Date(year, month, d).getTime();
    const dayEnd = dayStart + 86400000;
    return dated.filter((e) => e.s < dayEnd && e.en >= dayStart);
  };

  const upcoming = useMemo(
    () =>
      dated
        .filter((e) => e.en >= today.getTime())
        .sort((a, b) => a.s - b.s)
        .slice(0, 6),
    [dated, today]
  );

  const isToday = (d: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    d === today.getDate();

  const move = (delta: number) =>
    setCursor(new Date(year, month + delta, 1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gatherings"
        sub="Plan and manage events on the calendar."
        icon="game-icons:campfire"
        accent="#5cc08c"
        action={
          <Drawer
            title="New event"
            triggerLabel="New event"
            triggerIcon="mdi:plus"
          >
            <NewEventForm />
          </Drawer>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Calendar */}
        <div className="mm-glass p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => move(-1)}
                className="rounded-lg p-1.5 text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                aria-label="Previous month"
              >
                <Icon icon="mdi:chevron-left" width={20} />
              </button>
              <button
                onClick={() =>
                  setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
                }
                className="rounded-lg px-2 py-1 text-xs text-[var(--mm-text-dim)] transition hover:text-[var(--mm-text)]"
              >
                Today
              </button>
              <button
                onClick={() => move(1)}
                className="rounded-lg p-1.5 text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                aria-label="Next month"
              >
                <Icon icon="mdi:chevron-right" width={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-[var(--mm-text-dim)]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const evs = eventsOnDay(d);
              return (
                <div
                  key={i}
                  className="min-h-[84px] rounded-lg border border-[color-mix(in_srgb,var(--mm-border)_60%,transparent)] p-1.5"
                  style={
                    isToday(d)
                      ? { background: "color-mix(in srgb, var(--mm-gold) 12%, transparent)" }
                      : undefined
                  }
                >
                  <div
                    className={`text-right text-xs ${
                      isToday(d)
                        ? "font-semibold text-[var(--mm-gold)]"
                        : "text-[var(--mm-text-dim)]"
                    }`}
                  >
                    {d}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {evs.slice(0, 2).map((e) => (
                      <Link
                        key={e.slug}
                        href={`/events/${e.slug}`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] text-[var(--mm-text)]"
                        style={{
                          background:
                            "color-mix(in srgb, var(--mm-violet) 30%, transparent)",
                        }}
                        title={e.title}
                      >
                        {e.title}
                      </Link>
                    ))}
                    {evs.length > 2 && (
                      <span className="block px-1 text-[10px] text-[var(--mm-text-dim)]">
                        +{evs.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <aside className="space-y-3">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm uppercase tracking-widest text-[var(--mm-gold)]">
            <Icon icon="mdi:clock-outline" width={16} /> Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--mm-text-dim)]">
              Nothing scheduled. Add an event to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/events/${e.slug}`}
                    className="mm-glass block p-3 transition hover:border-[var(--mm-violet)]"
                  >
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                      <Icon icon="mdi:calendar" width={13} />
                      {e.startsAt && fmtDay(e.startsAt)} ·{" "}
                      {e.startsAt && fmtTime(e.startsAt)}
                    </p>
                    {e.location && (
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[var(--mm-text-dim)]">
                        <Icon icon="mdi:map-marker-outline" width={13} />
                        {e.location}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
