import Link from "next/link";
import { Icon } from "@/components/icon";
import { TextField, TextareaField } from "@/components/form";
import { DateTimeField } from "@/components/datetime-input";
import { submitCommunityEvent } from "../actions";
import { Flash } from "@/components/flash";
import { parseReturn } from "@/lib/return-to";

export const metadata = { title: "Submit an event" };

export default async function SubmitEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string; fromLabel?: string }>;
}) {
  const sp = await searchParams;
  const { error } = sp;
  // Offered from the events board and from the dashboard when the calendar is
  // empty, so "Back to events" was wrong half the time.
  const backTo = parseReturn(sp, { href: "/events", label: "Back to events" });

  return (
    <div className="max-w-2xl pb-24">
      <Link
        href={backTo.href}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        <Icon icon="mdi:arrow-left" width={15} /> {backTo.label}
      </Link>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
        Submit a <span className="mm-gradient-text">community event</span>
      </h1>
      <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
        Know of a gathering the community would love — a games night, a
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
          <DateTimeField
            label="Starts"
            icon="mdi:clock-outline"
            name="startsAt"
            required
          />
          <DateTimeField
            label="Ends"
            hint="optional"
            icon="mdi:clock-check-outline"
            name="endsAt"
          />
        </div>
        <button className="mm-btn mm-btn-primary w-full">
          <Icon icon="mdi:send" width={16} /> Submit for review
        </button>
      </form>
    </div>
  );
}
