import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getQuestAdmin,
  questClaimFeed,
  sharingFlags,
  guessFlags,
  paceFlags,
} from "@/lib/admin-quests";
import { listEvents } from "@/lib/admin";
import { getPartners } from "@/lib/content";
import { setQuestActive, deleteQuest } from "@/app/(admin)/actions";
import { ObjectiveTimeline } from "@/components/objective-timeline";
import { QuestSettingsForm } from "@/components/quest-settings-form";
import { FormCard } from "@/components/form";
import { formatDate } from "@/lib/format";
import { tagHostWarning } from "@/lib/app-url";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { BackLink } from "@/components/back-link";
import { forwardReturn, parseReturn } from "@/lib/return-to";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quest = await getQuestAdmin(slug);
  return { title: `${quest?.title ?? "Quest"} · Admin` };
}

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
  locked: "var(--mm-gold)",
  rate_limited: "var(--mm-gold)",
  wrong_account: "var(--mm-gold)",
};

export default async function AdminQuestEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    from?: string;
    fromLabel?: string;
  }>;
}) {
  const { slug } = await params;
  const [quest, events, partners, sp] = await Promise.all([
    getQuestAdmin(slug),
    listEvents(),
    getPartners(),
    searchParams,
  ]);
  if (!quest) notFound();
  const { saved, error } = sp;
  // Where the reader came from: the event that owns this quest, the quest
  // list, or the print sheet. Falls back to the list when nobody said.
  const backTo = parseReturn(sp, {
    href: "/admin/quests",
    label: "All quests",
  });

  const [feed, flags, guesses, pace] = await Promise.all([
    questClaimFeed(quest.id),
    sharingFlags(quest.id),
    guessFlags(quest.id),
    paceFlags(quest.id),
  ]);

  // The tag URLs are shown and copied from this page, so the warning belongs
  // here too — not only on the print sheet, which you might never open.
  const firstTag = quest.objectiveList.find((o) => o.type === "qr_scan");
  const tagWarning = firstTag ? await tagHostWarning(firstTag.tagUrl) : null;

  const partnerOptions = partners.map((p) => ({
    id: p.id,
    name: p.businessName,
  }));

  return (
    <div className="space-y-8">
      <PageHeading
        size="md"
        title={quest.title}
        subtitle={`${quest.objectives} objectives · ${quest.players} adventurers`}
        icon="game-icons:treasure-map"
        accent={ACCENT}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/quests/${quest.slug}`} className="mm-btn mm-btn-ghost">
              <Icon icon="mdi:eye-outline" width={16} /> View
            </Link>
            {/* Two different printed things: a sheet of small codes to cut up
                and stick on stands, and a full A4 poster per objective. */}
            <Link
              href={forwardReturn(`/admin/quests/${quest.slug}/tags`, sp)}
              className="mm-btn mm-btn-ghost"
            >
              <Icon icon="mdi:qrcode" width={16} /> Tag sheet
            </Link>
            <Link
              href={forwardReturn(`/admin/quests/${quest.slug}/print`, sp)}
              className="mm-btn mm-btn-ghost"
            >
              <Icon icon="mdi:printer-outline" width={16} /> Station pack
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

      <BackLink to={backTo} />

      {saved && <Flash>Saved.</Flash>}
      {/* Only the whole-record actions land here now — going live, deleting,
          reordering, rotating a station key. Form validation reports itself on
          the offending field instead of redirecting to a page-level line that
          named neither the field nor the reason. */}
      {error && (
        <Flash tone="error">That didn&apos;t work — please try again.</Flash>
      )}

      {tagWarning && (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm">
          <Icon
            icon="mdi:alert-outline"
            width={16}
            className="mr-1.5 inline text-[var(--mm-gold)]"
          />
          {tagWarning}
        </div>
      )}

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

      {pace.length > 0 && (
        <div className="mm-glass border-[var(--mm-danger)] p-4">
          <h3 className="flex items-center gap-2 font-medium text-[var(--mm-danger)]">
            <Icon icon="mdi:run-fast" width={18} />
            Check-ins nobody could have walked
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--mm-text-dim)]">
            {pace.map((p, i) => (
              <li key={i}>
                <span className="text-[var(--mm-text)]">{p.playerName}</span> —{" "}
                {p.hops === 1 ? "two objectives" : `${p.hops} pairs of objectives`}{" "}
                cleared as little as {p.fastestSeconds}s apart.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
            Either the tags were sent to them, or they were standing beside
            someone who scanned for both. Worth a look before you hand out a
            prize.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:flag-outline" width={20} style={{ color: ACCENT }} />
          The trail
        </h2>
        <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
          Objectives can be tackled in any order — this is the order they read
          in. Use a <Icon icon="mdi:plus" width={13} className="inline" /> between
          two of them to drop a new objective straight into that position.
        </p>
        <ObjectiveTimeline
          questSlug={quest.slug}
          objectives={quest.objectiveList}
          partners={partnerOptions}
          eventHasCoords={quest.eventHasCoords}
          sequential={quest.sequential}
        />
      </section>

      <FormCard title="Quest settings" icon="mdi:cog-outline" accent={ACCENT}>
        <QuestSettingsForm
          slug={quest.slug}
          title={quest.title}
          description={quest.description}
          eventId={quest.eventId}
          sequential={quest.sequential}
          startsAtLocal={toLocalInput(quest.startsAt)}
          endsAtLocal={toLocalInput(quest.endsAt)}
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            when: e.startsAt ? formatDate(e.startsAt) : "",
          }))}
        />
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
          <div className="mm-glass divide-y divide-[var(--mm-divider)]">
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
