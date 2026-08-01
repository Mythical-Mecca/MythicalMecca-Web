import Link from "next/link";
import { Icon } from "@/components/icon";
import { TextField, TextareaField, Field, inputCls } from "@/components/form";
import { submitCommunityEvent } from "../actions";
import { Flash } from "@/components/flash";

export const metadata = { title: "Submit an event — Mythical Mecca" };

export default async function SubmitEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl pb-24">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        <Icon icon="mdi:arrow-left" width={15} /> Back to events
      </Link>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
        Submit a <span className="mm-gradient-text">community event</span>
      </h1>
      <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
        Know of a gathering the collective would love — a games night, a
        screening, a meetup? Send it in. A moderator reviews every submission
        before it appears on the calendar.
      </p>

      {error && (
        <Flash tone="error" className="mt-6">
          Something was missing — add a title (2+ characters) and a start date.
        </Flash>
      )}

      <form action={submitCommunityEvent} className="mm-glass mt-8 space-y-5 p-6">
        <TextField
          label="Title"
          icon="game-icons:campfire"
          name="title"
          required
          placeholder="Saturday board-game meetup"
        />
        <TextField
          label="Summary"
          icon="mdi:text-short"
          name="summary"
          placeholder="One line on what makes it worth attending"
        />
        <TextareaField
          label="Details"
          icon="mdi:text-long"
          name="bodyMd"
          rows={6}
          placeholder="What, where, who's it for? Markdown is welcome."
        />
        <TextField
          label="Location"
          icon="mdi:map-marker-outline"
          name="location"
          placeholder="Venue or address"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts" icon="mdi:clock-outline">
            <input
              type="datetime-local"
              name="startsAt"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Ends (optional)" icon="mdi:clock-check-outline">
            <input type="datetime-local" name="endsAt" className={inputCls} />
          </Field>
        </div>
        <button className="mm-btn mm-btn-primary w-full">
          <Icon icon="mdi:send" width={16} /> Submit for review
        </button>
      </form>
    </div>
  );
}
