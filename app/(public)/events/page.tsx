import Link from "next/link";
import { getEvents } from "@/lib/content";
import { DivisionBadge } from "@/components/content-ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Ops — Mythic Mecha" };

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Upcoming <span className="mm-gradient-text">ops</span>
      </h1>
      <p className="mt-3 text-[var(--mm-text-dim)]">
        Gatherings, tournaments, screenings and hunts across the divisions.
      </p>

      <div className="mt-10 space-y-4">
        {events.map((e) => (
          <Link
            key={e.slug}
            href={`/events/${e.slug}`}
            className="mm-glass group flex flex-col gap-4 p-6 transition hover:border-[var(--mm-violet)] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="mb-2 flex items-center gap-3">
                <DivisionBadge division={e.division} />
                <span className="text-xs text-[var(--mm-text-dim)]">
                  {formatDateTime(e.startsAt)}
                </span>
              </div>
              <h2 className="text-xl font-medium group-hover:text-[var(--mm-gold)]">
                {e.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                {e.summary}
              </p>
              {e.location && (
                <p className="mt-1 text-xs text-[var(--mm-text-dim)]">
                  {e.location}
                </p>
              )}
            </div>
            <span className="mm-btn mm-btn-ghost shrink-0 text-sm">Details</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
