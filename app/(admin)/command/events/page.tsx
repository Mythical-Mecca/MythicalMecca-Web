import { listEvents } from "@/lib/admin";
import { EventsBoard } from "@/components/events-board";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const events = await listEvents();
  const { created, error } = await searchParams;

  return (
    <div className="space-y-6">
      {created && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Event scheduled.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not schedule — check the title and dates.
        </div>
      )}

      <EventsBoard
        events={events.map((e) => ({
          slug: e.slug,
          title: e.title,
          location: e.location,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          status: e.status,
        }))}
      />
    </div>
  );
}
