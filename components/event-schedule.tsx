"use client";

import { useEffect, useRef, useState } from "react";
import { Field, inputCls } from "./form";
import { Icon } from "./icon";

const dateStyle = { colorScheme: "dark" as const };

export function EventSchedule({
  onChange,
}: {
  onChange?: (v: { startsAt: string; endsAt: string }) => void;
}) {
  const [multiDay, setMultiDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("22:00");

  const endDateValue = multiDay ? endDate : startDate;
  const startsAt = startDate ? `${startDate}T${startTime}` : "";
  const endsAt = endDateValue ? `${endDateValue}T${endTime}` : "";

  // Report computed values up after state settles (avoids stale hidden-input reads).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current?.({ startsAt, endsAt });
  }, [startsAt, endsAt]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setMultiDay((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] px-4 py-3 text-sm transition hover:border-[var(--mm-violet)]"
      >
        <span className="flex items-center gap-2">
          <Icon icon="mdi:calendar-range" width={17} className="text-[var(--mm-gold)]" />
          Multi-day event
        </span>
        <span
          className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
            multiDay ? "bg-[var(--mm-gold)]" : "bg-[var(--mm-elevated)]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
              multiDay ? "left-[18px]" : "left-0.5"
            }`}
          />
        </span>
      </button>

      {!multiDay ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" icon="mdi:calendar">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
          <Field label="Starts">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
          <Field label="Ends">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date" icon="mdi:calendar">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
          <Field label="Start time">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
          <Field label="End date" icon="mdi:calendar">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputCls}
              style={dateStyle}
            />
          </Field>
        </div>
      )}

      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="endsAt" value={endsAt} />
    </div>
  );
}
