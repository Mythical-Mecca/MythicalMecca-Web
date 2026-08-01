import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/lib/format";
import type { EventView } from "@/lib/content";

/**
 * Compact, inline "live now" event card. Shrinks to its content (not full
 * width) and links to the event detail. Shown on the dashboard and atop the
 * Events page whenever an event is currently in its live window.
 */
export function LiveEventCard({ event }: { event: EventView }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="inline-flex max-w-full items-center gap-4 rounded-2xl border border-[var(--mm-live)] p-4 transition hover:brightness-110"
      style={{
        background:
          "linear-gradient(135deg, rgba(92,192,140,0.18), rgba(44,123,229,0.14))",
      }}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--mm-live) 22%, transparent)",
          color: "var(--mm-live)",
        }}
      >
        <Icon icon="game-icons:campfire" width={22} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--mm-live)]">
          <span className="mm-dot-live" /> Live now
        </span>
        <span className="mt-0.5 block truncate font-[family-name:var(--font-display)] text-lg opacity-90">
          {event.title}
        </span>
        <span className="block truncate text-xs text-[var(--mm-text-dim)]">
          {formatDateTime(event.startsAt)}
          {event.location ? ` · ${event.location}` : ""}
        </span>
      </span>
      <span className="mm-btn mm-btn-primary ml-2 shrink-0 text-sm max-sm:hidden">
        <Icon icon="mdi:arrow-right" width={16} /> Lets go
      </span>
    </Link>
  );
}
