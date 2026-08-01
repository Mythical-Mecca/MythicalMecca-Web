import Link from "next/link";
import { listQuestsAdmin } from "@/lib/admin-quests";
import { listEvents } from "@/lib/admin";
import { QuestCreateForm } from "@/components/quest-create-form";
import { PageHeader } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";

const ACCENT = "#9a6cff";

function windowLabel(startsAt: Date | null, endsAt: Date | null): string | null {
  if (!startsAt && !endsAt) return null;
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (startsAt && endsAt) return `${fmt(startsAt)} → ${fmt(endsAt)}`;
  return startsAt ? `From ${fmt(startsAt)}` : `Until ${fmt(endsAt!)}`;
}

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
    <div className="space-y-8">
      <PageHeader
        title="Quests"
        sub="Trails that walk adventurers around the venue, stand by stand."
        icon="game-icons:treasure-map"
        accent={ACCENT}
      />

      {deleted && <Flash>Quest deleted.</Flash>}
      {error && <Flash tone="error">Something went wrong — try again.</Flash>}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:map-marker-path" width={20} style={{ color: ACCENT }} />
          All quests{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({quests.length})
          </span>
        </h2>

        {quests.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No quests yet. Create one below, then add an objective for each stand
            you want people to visit.
          </p>
        ) : (
          <div className="space-y-2">
            {quests.map((q) => {
              const when = windowLabel(q.startsAt, q.endsAt);
              return (
                <Link
                  key={q.id}
                  href={`/admin/quests/${q.slug}`}
                  className="mm-glass flex flex-wrap items-center gap-4 p-4 transition hover:border-[var(--mm-violet)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{q.title}</span>
                      {q.active ? (
                        <Badge color="var(--mm-live)" icon="mdi:broadcast">
                          Live
                        </Badge>
                      ) : (
                        <Badge icon="mdi:pause">Off</Badge>
                      )}
                      {q.eventTitle && (
                        <Badge color="var(--mm-gold)" icon="game-icons:campfire">
                          {q.eventTitle}
                        </Badge>
                      )}
                    </div>
                    {when && (
                      <p className="mt-1 text-xs text-[var(--mm-text-dim)]">
                        {when}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-sm text-[var(--mm-text-dim)]">
                    <span className="flex items-center gap-1.5">
                      <Icon icon="mdi:flag-outline" width={15} />
                      {q.objectives}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon icon="mdi:account-group-outline" width={15} />
                      {q.players}
                    </span>
                    <Icon icon="mdi:chevron-right" width={18} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <QuestCreateForm
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
