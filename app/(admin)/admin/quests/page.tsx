import { PageHeading } from "@/components/page-heading";
import { listQuestsAdmin } from "@/lib/admin-quests";
import { listEvents } from "@/lib/admin";
import { QuestsTable } from "@/components/quests-table";
import { Flash } from "@/components/flash";
import { ACCENT } from "@/lib/accents";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quests · Admin" };

export default async function AdminQuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const [quests, events, { deleted, error }] = await Promise.all([
    listQuestsAdmin(),
    listEvents(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        size="md"
        title="Quests"
        subtitle="Trails that walk adventurers around the venue, stand by stand."
        icon="game-icons:treasure-map"
        accent={ACCENT.quests}
      />

      {deleted && <Flash>Quest deleted.</Flash>}
      {error && <Flash tone="error">Something went wrong — try again.</Flash>}

      <QuestsTable
        quests={quests}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          when: e.startsAt
            ? new Date(e.startsAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "",
        }))}
      />
    </div>
  );
}
