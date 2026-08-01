import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getQuestAdmin,
  questClaimFeed,
  sharingFlags,
  guessFlags,
} from "@/lib/admin-quests";
import { listEvents } from "@/lib/admin";
import { getPartners } from "@/lib/content";
import { setQuestActive, updateQuest, deleteQuest } from "@/app/(admin)/actions";
import { ObjectiveList } from "@/components/objective-list";
import { ObjectiveForm } from "@/components/objective-form";
import {
  PageHeader,
  FormCard,
  TextField,
  TextareaField,
} from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";

const ACCENT = "#9a6cff";

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time. */
function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const OUTCOME_TONE: Record<string, string> = {
  ok: "var(--mm-live)",
  duplicate: "var(--mm-text-dim)",
  bad_code: "var(--mm-danger)",
  out_of_range: "var(--mm-danger)",
  not_open: "var(--mm-gold)",
  unknown_step: "var(--mm-danger)",
};

export default async function AdminQuestEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { slug } = await params;
  const [quest, events, partners, { saved, error }] = await Promise.all([
    getQuestAdmin(slug),
    listEvents(),
    getPartners(),
    searchParams,
  ]);
  if (!quest) notFound();

  const [feed, flags, guesses] = await Promise.all([
    questClaimFeed(quest.id),
    sharingFlags(quest.id),
    guessFlags(quest.id),
  ]);

  const partnerOptions = partners.map((p) => ({
    id: p.id,
    name: p.businessName,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={quest.title}
        sub={`${quest.objectives} objectives · ${quest.players} adventurers`}
        icon="game-icons:treasure-map"
        accent={ACCENT}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/quests/${quest.slug}`} className="mm-btn mm-btn-ghost">
              <Icon icon="mdi:eye-outline" width={16} /> View
            </Link>
            <Link
              href={`/admin/quests/${quest.slug}/tags`}
              className="mm-btn mm-btn-ghost"
            >
              <Icon icon="mdi:printer-outline" width={16} /> Tags
            </Link>
            <form action={setQuestActive}>
              <input type="hidden" name="slug" value={quest.slug} />
              <input
                type="hidden"
                name="active"
                value={quest.active ? "0" : "1"}
              />
              <button
                className={`mm-btn ${
                  quest.active ? "mm-btn-ghost" : "mm-btn-primary"
                }`}
              >
                <Icon
                  icon={quest.active ? "mdi:pause" : "mdi:broadcast"}
                  width={16}
                />
                {quest.active ? "Take offline" : "Go live"}
              </button>
            </form>
          </div>
        }
      />

      <Link
        href="/admin/quests"
        className="inline-flex items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        <Icon icon="mdi:chevron-left" width={16} /> All quests
      </Link>

      {saved && <Flash>Saved.</Flash>}
      {error && <Flash tone="error">Could not save — check the fields.</Flash>}

      {!quest.active && (
        // Being offline is the single most confusing state in the builder: the
        // quest looks completely set up, but it is absent from the quest board
        // AND from its own event's page, with nothing on either page to say
        // why. Spell out the consequence and put the fix right here.
        <div className="mm-glass border-[var(--mm-gold)] p-4">
          <h3 className="flex items-center gap-2 font-medium text-[var(--mm-gold)]">
            <Icon icon="mdi:pause-circle-outline" width={18} />
            This quest is offline
          </h3>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            It won&apos;t show on the quest board
            {quest.eventTitle ? (
              <>
                , or on the page for{" "}
                <span className="text-[var(--mm-text)]">
                  {quest.eventTitle.trim()}
                </span>
              </>
            ) : null}
            , and nobody can check in. Everything else is ready — this is the
            only switch left.
          </p>
          <form action={setQuestActive} className="mt-3">
            <input type="hidden" name="slug" value={quest.slug} />
            <input type="hidden" name="active" value="1" />
            <button className="mm-btn mm-btn-primary">
              <Icon icon="mdi:broadcast" width={16} /> Go live
            </button>
          </form>
        </div>
      )}

      {flags.length > 0 && (
        <div className="mm-glass border-[var(--mm-danger)] p-4">
          <h3 className="flex items-center gap-2 font-medium text-[var(--mm-danger)]">
            <Icon icon="mdi:alert-outline" width={18} />
            Possible link sharing
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--mm-text-dim)]">
            {flags.map((f, i) => (
              <li key={i}>
                <span className="text-[var(--mm-text)]">{f.objectiveTitle}</span>{" "}
                — {f.claims} check-ins from one address in the last hour.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
            Switching that objective to a live code shuts this down immediately.
          </p>
        </div>
      )}

      {guesses.length > 0 && (
        <div className="mm-glass border-[var(--mm-danger)] p-4">
          <h3 className="flex items-center gap-2 font-medium text-[var(--mm-danger)]">
            <Icon icon="mdi:shield-alert-outline" width={18} />
            Someone is guessing codes
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--mm-text-dim)]">
            {guesses.map((g, i) => (
              <li key={i}>
                <span className="text-[var(--mm-text)]">{g.objectiveTitle}</span>{" "}
                — {g.attempts} wrong codes from one address in the last hour.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
            They&apos;re already being throttled after 10 wrong codes, so this
            is unlikely to have worked — but it&apos;s worth knowing about.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:flag-outline" width={20} style={{ color: ACCENT }} />
          The trail
        </h2>
        <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
          Objectives can be tackled in any order — this list is the order they
          read in.
        </p>
        <ObjectiveList
          questSlug={quest.slug}
          objectives={quest.objectiveList}
          partners={partnerOptions}
          eventHasCoords={quest.eventHasCoords}
        />
      </section>

      <FormCard title="Add an objective" icon="mdi:plus" accent={ACCENT}>
        <ObjectiveForm
          questSlug={quest.slug}
          partners={partnerOptions}
          eventHasCoords={quest.eventHasCoords}
        />
      </FormCard>

      <FormCard title="Quest settings" icon="mdi:cog-outline" accent={ACCENT}>
        <form action={updateQuest} className="space-y-4">
          <input type="hidden" name="slug" value={quest.slug} />
          <TextField
            label="Title"
            name="title"
            required
            defaultValue={quest.title}
            icon="mdi:format-title"
          />
          <TextareaField
            label="Description"
            name="description"
            rows={3}
            defaultValue={quest.description}
            icon="mdi:text"
          />
          <PickerField
            label="Attached event"
            name="eventId"
            icon="game-icons:campfire"
            placeholder="Not tied to an event"
            defaultValue={
              events.find((e) => e.slug === quest.eventSlug)?.id ?? ""
            }
            description="The event's coordinates are what venue checks measure against."
            options={events.map((e) => ({
              value: e.id,
              label: e.title,
              hint: e.startsAt
                ? new Date(e.startsAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : undefined,
              icon: "game-icons:campfire",
            }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Opens"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInput(quest.startsAt)}
              icon="mdi:clock-start"
              hint="optional"
            />
            <TextField
              label="Closes"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInput(quest.endsAt)}
              icon="mdi:clock-end"
              hint="optional"
            />
          </div>
          <p className="text-xs text-[var(--mm-text-dim)]">
            Outside these times the quest is closed even while it&apos;s live.
            Leave both empty to rely on the live switch alone.
          </p>
          <button className="mm-btn mm-btn-primary">Save settings</button>
        </form>
      </FormCard>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:pulse" width={20} style={{ color: ACCENT }} />
          Check-in activity
        </h2>
        {feed.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            Nothing yet — attempts show up here the moment people start scanning.
          </p>
        ) : (
          <div className="mm-glass divide-y divide-[var(--mm-border)]">
            {feed.map((row, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
              >
                <Badge color={OUTCOME_TONE[row.outcome]}>{row.outcome}</Badge>
                <span className="min-w-0 flex-1 truncate">
                  {row.objectiveTitle}
                </span>
                <span className="text-xs text-[var(--mm-text-dim)]">
                  {row.ip ?? "—"}
                </span>
                <span className="text-xs text-[var(--mm-text-dim)]">
                  {new Date(row.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mm-glass border-[var(--mm-danger)] p-5">
        <h3 className="font-medium text-[var(--mm-danger)]">Delete quest</h3>
        <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
          Removes the quest, its objectives and everyone&apos;s progress. There
          is no undo.
        </p>
        <form action={deleteQuest} className="mt-3">
          <input type="hidden" name="slug" value={quest.slug} />
          <button className="mm-btn mm-btn-ghost text-sm text-[var(--mm-danger)]">
            Delete permanently
          </button>
        </form>
      </section>
    </div>
  );
}
