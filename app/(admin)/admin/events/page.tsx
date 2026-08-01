import { listEvents } from "@/lib/admin";
import { getPartners } from "@/lib/content";
import { EventsBoard } from "@/components/events-board";
import { EventAdminTabs } from "@/components/event-admin-tabs";
import { Flash } from "@/components/flash";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const [events, partners, { created }] = await Promise.all([
    listEvents(),
    getPartners(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <EventAdminTabs active="/admin/events" />
      {created && <Flash>Event scheduled.</Flash>}

      <EventsBoard
        events={events.map((e) => ({
          slug: e.slug,
          title: e.title,
          location: e.location,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          status: e.status,
        }))}
        partners={partners.map((p) => ({
          id: p.id,
          name: p.businessName,
        }))}
      />
    </div>
  );
}
