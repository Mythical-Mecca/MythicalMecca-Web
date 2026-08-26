"use client";

import { useState, useSyncExternalStore } from "react";
import { Field } from "@/components/form";
import { DateTimeInput } from "@/components/datetime-input";

const noopSubscribe = () => () => {};
const pad = (n: number) => String(n).padStart(2, "0");

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` — in UTC or in the reader's zone. */
function toInput(iso: string | null, local: boolean): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return local
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`
    : d.toISOString().slice(0, 16);
}

/**
 * A datetime field that means what the admin thinks it means.
 *
 * A server-rendered `datetime-local` shows the *server's* wall clock — UTC on
 * Vercel — so an admin in Johannesburg reading "09:00" is looking at 11:00
 * their time, and every save quietly shifts the event. This renders UTC on the
 * server, re-renders in the reader's own timezone the moment it hydrates, and
 * submits a real ISO instant through a hidden input.
 *
 * The hidden input holds the original ISO until the field is actually touched,
 * so a no-JS submit round-trips the existing value rather than reinterpreting
 * it.
 */
export function LocalDateTimeField({
  name,
  label,
  valueIso,
  icon,
  hint = "optional",
  description,
}: {
  name: string;
  label: string;
  valueIso: string | null;
  icon?: string;
  hint?: string;
  description?: string;
}) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const [edited, setEdited] = useState<string | null>(null);

  const shown = edited ?? toInput(valueIso, isClient);
  const iso =
    edited === null
      ? (valueIso ?? "")
      : edited
        ? (new Date(edited).toISOString() ?? "")
        : "";

  return (
    <Field label={label} icon={icon} hint={hint} description={description}>
      <>
        <DateTimeInput
          type="datetime-local"
          fieldLabel={label}
          value={shown}
          onChange={(e) => setEdited(e.currentTarget.value)}
        />
        <input type="hidden" name={name} value={iso} />
        {!isClient && (
          <noscript>
            <span className="mt-1 block text-xs text-[var(--mm-text-dim)]">
              Times shown in UTC until the page loads.
            </span>
          </noscript>
        )}
      </>
    </Field>
  );
}
