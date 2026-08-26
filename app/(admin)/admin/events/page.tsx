import { PageHeading } from "@/components/page-heading";
import { listEventRows } from "@/lib/admin";
import { getPartners } from "@/lib/content";
import { EventsTable } from "@/components/events-table";
import { EventAdminTabs } from "@/components/event-admin-tabs";

import { Flash } from "@/components/flash";

export const metadata = { title: "Events · Admin" };

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const [events, partners, { created }] = await Promise.all([
    listEventRows(),
    getPartners(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <EventAdminTabs active="/admin/events" />

      <PageHeading
        size="md"
        title="Events"
        subtitle="Every event, every field — edit in place."
        icon="game-icons:campfire"
        accent="#5cc08c"
      />

      {created && <Flash>Event scheduled.</Flash>}

      <EventsTable
        events={events}
        partners={partners.map((p) => ({ id: p.id, name: p.businessName }))}
      />
    </div>
  );
}
