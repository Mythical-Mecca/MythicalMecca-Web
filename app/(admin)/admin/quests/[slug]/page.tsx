import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getQuestAdmin,
  questClaimFeed,
  questRoster,
  sharingFlags,
  guessFlags,
  paceFlags,
  signupCount,
  unmatchedSignups,
} from "@/lib/admin-quests";
import { DEFAULT_SIGNUP_LABEL } from "@/lib/signup";
import { CopyLink } from "@/components/copy-link";
import { listEvents } from "@/lib/admin";
import { listMembers } from "@/lib/admin-users";
import { getPartners } from "@/lib/content";
import {
  setQuestActive,
  deleteQuest,
  rotateSignupSecret,
} from "@/app/(admin)/actions";
import { ObjectiveTimeline } from "@/components/objective-timeline";
import { QuestSettingsForm } from "@/components/quest-settings-form";
import { QuestProgress } from "@/components/quest-progress";
import { FormCard } from "@/components/form";
import { formatDate, formatDateTime } from "@/lib/format";
import { tagHostWarning } from "@/lib/app-url";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { BackLink } from "@/components/back-link";
import { ConfirmButton } from "@/components/confirm-button";
import { SectionTabs } from "@/components/section-tabs";
import { forwardReturn, parseReturn, withReturn } from "@/lib/return-to";

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

const TABS = [
  { key: "progress", label: "Progress", icon: "mdi:account-group-outline" },
  { key: "trail", label: "Trail", icon: "mdi:flag-outline" },
  { key: "settings", label: "Settings", icon: "mdi:cog-outline" },
  { key: "activity", label: "Activity", icon: "mdi:pulse" },
  {
    key: "advanced",
    label: "Advanced",
    icon: "mdi:alert-outline",
    tone: "danger" as const,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTab(v: string | undefined): v is TabKey {
  return TABS.some((t) => t.key === v);
}

/**
 * Build a section URL that keeps the return-to, so switching tabs does not
 * forget that you came from the event this quest belongs to.
 */
function sectionHref(
  slug: string,
  tab: TabKey,
  sp: { from?: string; fromLabel?: string }
): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (sp.from) params.set("from", sp.from);
  if (sp.fromLabel) params.set("fromLabel", sp.fromLabel);
  return `/admin/quests/${slug}?${params.toString()}`;
}

const TOOL_ITEM =
  "inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-2 px-3 text-sm text-[var(--mm-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] hover:text-[var(--mm-gold)] sm:flex-none sm:px-4";

/**
 * Header tools for one quest: a single segmented bar for the three places you
 * can go, and a separate live switch so taking it offline doesn't sit in the
 * same pile as "open the tag sheet".
 */
function QuestToolbar({
  slug,
  active,
  tab,
  tagsHref,
  printHref,
}: {
  slug: string;
  active: boolean;
  tab: TabKey;
  tagsHref: string;
  printHref: string;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div
        role="toolbar"
        aria-label="Quest tools"
        className="flex overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--mm-border)_85%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)]"
      >
        <Link href={`/quests/${slug}`} className={TOOL_ITEM}>
          <Icon icon="mdi:eye-outline" width={16} />
          View
        </Link>
        <Link
          href={tagsHref}
          className={`${TOOL_ITEM} border-l border-[color-mix(in_srgb,var(--mm-divider)_80%,transparent)]`}
        >
          <Icon icon="mdi:qrcode" width={16} />
          <span className="sm:hidden">Tags</span>
          <span className="hidden sm:inline">Tag sheet</span>
        </Link>
        <Link
          href={printHref}
          className={`${TOOL_ITEM} border-l border-[color-mix(in_srgb,var(--mm-divider)_80%,transparent)]`}
        >
          <Icon icon="mdi:printer-outline" width={16} />
          <span className="sm:hidden">Pack</span>
          <span className="hidden sm:inline">Station pack</span>
        </Link>
      </div>
      <form action={setQuestActive} className="sm:shrink-0">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="active" value={active ? "0" : "1"} />
        <input type="hidden" name="tab" value={tab} />
        <button
          type="submit"
          aria-label={active ? "Take quest offline" : "Go live"}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors sm:w-auto ${
            active
              ? "border border-[color-mix(in_srgb,var(--mm-live)_40%,transparent)] bg-[color-mix(in_srgb,var(--mm-live)_12%,transparent)] text-[var(--mm-live)] hover:bg-[color-mix(in_srgb,var(--mm-live)_20%,transparent)]"
              : "mm-btn mm-btn-primary"
          }`}
        >
          {active ? (
            <>
              <span className="mm-dot-live" />
              Live
              <span className="hidden text-[var(--mm-text-dim)] sm:inline">·</span>
              <span className="hidden sm:inline">Take offline</span>
            </>
          ) : (
            <>
              <Icon icon="mdi:broadcast" width={16} />
              Go live
            </>
          )}
        </button>
      </form>
    </div>
  );
}

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
  not_allowed: "var(--mm-gold)",
};

const OUTCOME_LABEL: Record<string, string> = {
  ok: "Checked in",
  duplicate: "Already done",
  bad_code: "Wrong code",
  out_of_range: "Out of range",
  not_open: "Not open",
  unknown_step: "Unknown tag",
  locked: "Locked",
  rate_limited: "Too many tries",
  wrong_account: "Wrong account",
  not_allowed: "Not on the list",
};

export default async function AdminQuestEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    tab?: string;
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

  const [feed, flags, guesses, pace, members, roster, unmatched, signups] =
    await Promise.all([
      questClaimFeed(quest.id),
      sharingFlags(quest.id),
      guessFlags(quest.id),
      paceFlags(quest.id),
      // Only to autocomplete the allow list. A no-data event has no members to
      // offer, and asking for them there would be the one query on this page
      // that reads the table that event promised to stay out of.
      quest.eventNoDataMode ? Promise.resolve([]) : listMembers(),
      questRoster(quest.id),
      quest.signupUrl ? unmatchedSignups(quest.eventId) : Promise.resolve([]),
      quest.signupWebhookUrl ? signupCount(quest.eventId) : Promise.resolve(0),
    ]);
  const signupLabel = quest.signupLabel?.trim() || DEFAULT_SIGNUP_LABEL;
  const memberEmails = members
    .map((m) => m.email)
    .filter((e): e is string => !!e)
    .sort();

  // The tag URLs are shown and copied from this page, so the warning belongs
  // here too — not only on the print sheet, which you might never open.
  const firstTag = quest.objectiveList.find((o) => o.type === "qr_scan");
  const tagWarning = firstTag ? await tagHostWarning(firstTag.tagUrl) : null;

  const partnerOptions = partners.map((p) => ({
    id: p.id,
    name: p.businessName,
  }));
  const hiddenCount = quest.objectiveList.filter((o) => o.hidden).length;
  const listedCount = quest.objectiveList.length - hiddenCount;

  // During the event the organiser wants the field. While they are still
  // building, they want the trail. An explicit `?tab=` always wins.
  const tab: TabKey = isTab(sp.tab)
    ? sp.tab
    : roster.length > 0
      ? "progress"
      : "trail";

  const tagsHref = forwardReturn(`/admin/quests/${quest.slug}/tags`, sp);
  const printHref = forwardReturn(`/admin/quests/${quest.slug}/print`, sp);

  const COUNTS: Record<TabKey, number | undefined> = {
    progress: roster.length,
    trail: quest.objectiveList.length,
    settings: undefined,
    activity: feed.length,
    advanced: undefined,
  };

  const alertCount = flags.length + guesses.length + pace.length;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-3">
        <BackLink to={backTo} />
        <PageHeading
          size="md"
          title={quest.title}
          subtitle={
            <>
              <Link
                href={withReturn(`/admin/events/${quest.eventId}?tab=quests`, {
                  href: sectionHref(quest.slug, tab, sp),
                  label: quest.title,
                })}
                className="hover:text-[var(--mm-text)]"
              >
                {quest.eventTitle}
              </Link>
              {" · "}
              {quest.sequential ? "Walked in order" : "Any order"}
              {listedCount > 0
                ? ` · ${listedCount} ${listedCount === 1 ? "objective" : "objectives"}`
                : " · No objectives yet"}
              {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
            </>
          }
          icon="game-icons:treasure-map"
          accent={ACCENT}
        />
        <QuestToolbar
          slug={quest.slug}
          active={quest.active}
          tab={tab}
          tagsHref={tagsHref}
          printHref={printHref}
        />
      </div>

      {saved && <Flash>Saved.</Flash>}
      {/* Only the whole-record actions land here now — going live, deleting,
          reordering, rotating a station key. Form validation reports itself on
          the offending field instead of redirecting to a page-level line that
          named neither the field nor the reason. */}
      {error && (
        <Flash tone="error">That didn&apos;t work — please try again.</Flash>
      )}

      {tab === "trail" && tagWarning && (
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
            <input type="hidden" name="tab" value={tab} />
            <button className="mm-btn mm-btn-primary">
              <Icon icon="mdi:broadcast" width={16} /> Go live
            </button>
          </form>
        </div>
      )}

      {alertCount > 0 && (
        <div className="space-y-3">
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
                    {p.hops === 1
                      ? "two objectives"
                      : `${p.hops} pairs of objectives`}{" "}
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
        </div>
      )}

      <SectionTabs
        label="Quest sections"
        items={TABS.map((t) => ({
          href: sectionHref(quest.slug, t.key, sp),
          label: t.label,
          icon: t.icon,
          tone: "tone" in t ? t.tone : undefined,
          count: COUNTS[t.key],
        }))}
        active={sectionHref(quest.slug, tab, sp)}
        accent={ACCENT}
      />

      {tab === "progress" && (
        <QuestProgress
          objectives={quest.objectiveList}
          participants={roster}
          active={quest.active}
          tagsHref={tagsHref}
          printHref={printHref}
          accent={ACCENT}
          signup={
            quest.signupUrl ? { label: signupLabel, unmatched } : null
          }
        />
      )}

      {tab === "trail" && (
        <ObjectiveTimeline
          questSlug={quest.slug}
          objectives={quest.objectiveList}
          partners={partnerOptions}
          eventHasCoords={quest.eventHasCoords}
          sequential={quest.sequential}
        />
      )}

      {tab === "settings" && (
        <FormCard title="Quest settings" icon="mdi:cog-outline" accent={ACCENT}>
          <QuestSettingsForm
            slug={quest.slug}
            title={quest.title}
            description={quest.description}
            eventId={quest.eventId}
            sequential={quest.sequential}
            startsAtLocal={toLocalInput(quest.startsAt)}
            endsAtLocal={toLocalInput(quest.endsAt)}
            allowListEnabled={quest.allowListEnabled}
            allowList={quest.allowList}
            noDataMode={quest.eventNoDataMode}
            memberEmails={memberEmails}
            prizeTiers={quest.prizeTiers}
            signupUrl={quest.signupUrl}
            signupLabel={quest.signupLabel}
            signupBlurb={quest.signupBlurb}
            events={events.map((e) => ({
              id: e.id,
              title: e.title,
              when: e.startsAt ? formatDate(e.startsAt) : "",
            }))}
          />
        </FormCard>
      )}

      {tab === "settings" && quest.eventNoDataMode && quest.signupWebhookUrl && (
        /* The other half of the external sign-up step. Lives outside the
           settings form because rotating the secret is its own action, and a
           form can't sit inside a form. */
        <FormCard
          title="Sign-up webhook"
          icon="mdi:webhook"
          accent={ACCENT}
        >
          <div className="space-y-4 text-sm">
            <p className="text-[var(--mm-text-dim)]">
              Point the form at this address and the tick on a player&apos;s
              page becomes a confirmation. Anyone holding the link can post
              to it, so treat it like a password — and rotate it if it gets
              out.
            </p>
            <CopyLink url={quest.signupWebhookUrl} />
            <div className="rounded-xl border border-[var(--mm-divider)] p-4">
              <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                What to send
              </p>
              <p className="mt-1 text-[var(--mm-text-dim)]">
                One <code className="font-mono text-xs">POST</code>
                {" "}per submission, as JSON or a form post. The player&apos;s
                username is the only field that matters; a reference from
                the form is kept alongside it if you send one. Nothing else
                in the body is stored.
              </p>
              <pre className="mm-inset mt-3 overflow-x-auto rounded-xl px-4 py-3 font-mono text-xs leading-relaxed">
{`{ "handle": "Sheldor the Conqueror", "externalId": "CCA-1234" }`}
              </pre>
              <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
                Matched to the name a player picked here, ignoring capitals.
                The reply says whether it matched anyone yet; a miss is kept
                and matches the moment they pick that name.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[var(--mm-text-dim)]">
                {signups === 0
                  ? "Nothing has arrived yet."
                  : `${signups} sign-up${signups === 1 ? "" : "s"} received for this event.`}
              </p>
              <form action={rotateSignupSecret}>
                <input type="hidden" name="slug" value={quest.slug} />
                <ConfirmButton
                  label="Rotate secret"
                  confirmLabel="Rotate — the old link stops working"
                  icon="mdi:refresh"
                  title="Rotate the webhook secret?"
                  body="The current address stops accepting posts immediately. You'll need to paste the new one into the form."
                  className="mm-btn mm-btn-ghost text-sm"
                  tone="normal"
                />
              </form>
            </div>
          </div>
        </FormCard>
      )}

      {tab === "activity" && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Icon icon="mdi:pulse" width={20} style={{ color: ACCENT }} />
            Check-in log
          </h2>
          <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
            Every attempt, successful or not. Sharing and guess bursts surface
            as alerts above — this is the raw tape.
          </p>
          {feed.length === 0 ? (
            <div className="mm-glass px-6 py-10 text-center">
              <p className="text-sm text-[var(--mm-text-dim)]">
                Nothing yet — attempts show up here the moment people start
                scanning.
              </p>
            </div>
          ) : (
            <ul className="mm-glass divide-y divide-[var(--mm-divider)]">
              {feed.map((row, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <Badge color={OUTCOME_TONE[row.outcome]}>
                    {OUTCOME_LABEL[row.outcome] ?? row.outcome}
                  </Badge>
                  <span className="min-w-0 flex-1">
                    <span className="text-[var(--mm-text)]">
                      {row.playerName ?? "Someone"}
                    </span>
                    {row.objectiveTitle ? (
                      <span className="text-[var(--mm-text-dim)]">
                        {" · "}
                        {row.objectiveTitle}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--mm-text-dim)]">
                    {row.ip ?? "—"}
                  </span>
                  <span className="text-xs text-[var(--mm-text-dim)]">
                    {formatDateTime(row.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "advanced" && (
        <section
          className="mm-glass p-6"
          style={{ borderColor: "var(--mm-danger)" }}
        >
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-[var(--mm-danger)]">
            <Icon icon="mdi:alert-outline" width={20} />
            Delete this quest
          </h2>
          <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
            Removes the quest, its objectives and everyone&apos;s progress.
            There is no undo. Taking it offline is almost always the better
            move — the trail stays, and you can put it back on the board later.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--mm-text-dim)]">
            <li>
              · {quest.objectiveList.length}{" "}
              {quest.objectiveList.length === 1 ? "objective" : "objectives"}
              {hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""} will go with
              it.
            </li>
            <li>
              ·{" "}
              {roster.length === 0
                ? "Nobody has checked in yet."
                : `${roster.length} adventurer${roster.length === 1 ? "'s" : "s'"} progress is deleted with it.`}
            </li>
          </ul>
          <form action={deleteQuest} className="mt-5">
            <input type="hidden" name="slug" value={quest.slug} />
            <ConfirmButton
              label="Delete quest"
              confirmLabel="Delete permanently"
              icon="mdi:trash-can-outline"
              title={`Delete "${quest.title}"?`}
              body="This cannot be undone. The trail and everyone's progress go with it."
              className="mm-btn mm-btn-ghost text-sm text-[var(--mm-danger)]"
            />
          </form>
        </section>
      )}
    </div>
  );
}
