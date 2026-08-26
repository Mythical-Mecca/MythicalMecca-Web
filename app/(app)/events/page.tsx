import Link from "next/link";
import { Card } from "@/components/card";
import { LiveEventCard } from "@/components/live-event-card";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { EventCalendar } from "@/components/event-calendar";
import { EventOriginBadge } from "@/components/event-origin-badge";
import { getEventsPage, isEventLive } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { SectionHero } from "@/components/section-hero";
import { ACCENT } from "@/lib/accents";

export const metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  // The calendar shows the full published history; the list below is strictly
  // what's still to come.
  const { all: events, live: liveEvent, upcoming } = await getEventsPage();
  const nowIso = new Date().toISOString();
  const calEvents = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    location: e.location,
  }));

  return (
    <div className="space-y-6 pb-24">
      <SectionHero
        section="events"
        actions={
          <Link href="/events/submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={18} /> Submit an event
          </Link>
        }
      />

      {submitted && (
        <Flash>
          Your event was submitted and awaits the moderators&apos; blessing. It
          appears here once approved.
        </Flash>
      )}

      {liveEvent && (
        <div>
          <LiveEventCard event={liveEvent} />
        </div>
      )}

      {/* ---------------- Calendar — the page's centrepiece ---------------- */}
      <EventCalendar events={calEvents} todayIso={nowIso} />

      {/* ---------------- Upcoming, as a scannable list ---------------- */}
      {/* Not "Upcoming events" — that is already the page's H1, and repeating
          it made the same words the heading of both the page and a card inside
          it. This card is the list view of what the calendar above shows. */}
      <Card
        title="Next gatherings"
        icon="game-icons:campfire"
        accent={ACCENT.events}
        action={{ href: "/events/submit", label: "Submit an event" }}
      >
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No gatherings on the calendar yet — check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--mm-divider)]">
            {upcoming.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/events/${e.slug}`}
                  className="group flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-[family-name:var(--font-display)] opacity-90 group-hover:text-[var(--mm-gold)]">
                      {e.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[var(--mm-text-dim)]">
                      <Icon icon="mdi:clock-outline" width={13} />
                      {formatDateTime(e.startsAt)}
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isEventLive(e) && (
                      <Badge color="var(--mm-live)" dot>
                        Live
                      </Badge>
                    )}
                    <EventOriginBadge origin={e.origin} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
