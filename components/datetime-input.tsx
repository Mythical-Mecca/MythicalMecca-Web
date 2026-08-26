"use client";

import { useRef } from "react";
import { Icon } from "@/components/icon";
import { Field, inputCls } from "@/components/form";

export type DateTimeKind = "date" | "time" | "datetime-local";

const KIND_ICON: Record<DateTimeKind, string> = {
  date: "mdi:calendar-month-outline",
  time: "mdi:clock-outline",
  "datetime-local": "mdi:calendar-clock-outline",
};

const KIND_NOUN: Record<DateTimeKind, string> = {
  date: "date picker",
  time: "time picker",
  "datetime-local": "date and time picker",
};

/**
 * A date/time input with a picker button we actually control.
 *
 * Browsers draw their own indicator glyph inside these inputs and give you no
 * way to colour it. Against this surface Chrome renders a near-black square on
 * near-black — the affordance was there, just invisible. So the native
 * indicator is hidden (`.mm-date-input` in globals.css) and replaced with a
 * real button that calls `showPicker()`.
 *
 * Deliberately still a button in the tab order: the glyph it replaces was not
 * reachable by keyboard in Chrome either, so this is a small gain rather than a
 * regression, and typing into the field remains the faster path.
 */
export function DateTimeInput({
  type = "datetime-local",
  fieldLabel,
  className,
  ...rest
}: {
  type?: DateTimeKind;
  /** Names the button for screen readers — "Open Starts date picker". */
  fieldLabel?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const ref = useRef<HTMLInputElement>(null);

  const open = (e: React.MouseEvent) => {
    // `Field` wraps the whole thing in a <label>, so without this the click
    // also activates the label, which forwards a second click to the input.
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    // Focus first: if showPicker isn't available (older Safari, or a browser
    // that refuses outside a user gesture) the caret still lands in the field,
    // which is the same thing the native glyph would have done.
    el.focus();
    try {
      el.showPicker();
    } catch {
      /* not supported here — focus is the fallback */
    }
  };

  return (
    <span className="relative block">
      <input
        ref={ref}
        type={type}
        {...rest}
        className={`${inputCls} mm-date-input pr-12 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={open}
        aria-label={
          fieldLabel
            ? `Open ${fieldLabel} ${KIND_NOUN[type]}`
            : `Open ${KIND_NOUN[type]}`
        }
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-gold)]"
      >
        <Icon icon={KIND_ICON[type]} width={18} />
      </button>
    </span>
  );
}

/**
 * `DateTimeInput` in a `Field` — the drop-in for what used to be a
 * `<TextField type="datetime-local">`.
 */
export function DateTimeField({
  label,
  icon,
  description,
  hint,
  className,
  error,
  type = "datetime-local",
  ...rest
}: {
  label: string;
  icon?: string;
  description?: string;
  hint?: string;
  className?: string;
  error?: string | null;
  type?: DateTimeKind;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <Field
      label={label}
      icon={icon}
      description={description}
      hint={hint}
      className={className}
      error={error}
      required={rest.required}
    >
      <DateTimeInput type={type} fieldLabel={label} {...rest} />
    </Field>
  );
}
