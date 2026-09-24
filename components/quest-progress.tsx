import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import type {
  AdminObjective,
  QuestParticipant,
  UnmatchedSignup,
} from "@/lib/admin-quests";
import { formatDateTime } from "@/lib/format";

/**
 * The floor view of a quest: who is playing, how far each of them has got,
 * and which stands are actually being found.
 *
 * This is the page an organiser opens *during* the event. The trail editor
 * and the settings form are the other job — building the thing — and they
 * live on their own tabs so this one can stay a scoreboard.
 */

function listedIds(objectives: AdminObjective[]): string[] {
  return objectives.filter((o) => !o.hidden).map((o) => o.id);
}

function listedDone(p: QuestParticipant, listed: string[]): number {
  const done = new Set(p.completedStepIds);
  return listed.filter((id) => done.has(id)).length;
}

function sortRoster(
  participants: QuestParticipant[],
  listed: string[]
): QuestParticipant[] {
  return [...participants].sort((a, b) => {
    const aN = listedDone(a, listed);
    const bN = listedDone(b, listed);
    if (bN !== aN) return bN - aN;
    if (b.points !== a.points) return b.points - a.points;
    return (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0);
  });
}

export function QuestProgress({
  objectives,
  participants,
  active,
  tagsHref,
  printHref,
  completionsHref,
  accent,
  signup = null,
}: {
  objectives: AdminObjective[];
  participants: QuestParticipant[];
  active: boolean;
  tagsHref: string;
  printHref: string;
  /** Link to the Completions tab — the roster table lives there. */
  completionsHref?: string;
  accent: string;
  /**
   * Present when the quest asks players to fill in an external form. Adds
   * a sign-up mark per adventurer and a list of webhook arrivals that match
   * nobody — the typos worth catching while they are still in the hall.
   */
  signup?: { label: string; unmatched: UnmatchedSignup[] } | null;
}) {
  const listed = listedIds(objectives);
  const roster = sortRoster(participants, listed);
  const finishers = roster.filter(
    (p) => listed.length > 0 && listedDone(p, listed) === listed.length
  ).length;
  const checkIns = objectives.reduce((n, o) => n + o.completions, 0);
  const field = Math.max(roster.length, 1);
  const confirmed = roster.filter((p) => p.signup?.state === "confirmed").length;

  if (roster.length === 0) {
    return (
      <EmptyProgress
        active={active}
        hasTrail={objectives.length > 0}
        tagsHref={tagsHref}
        printHref={printHref}
        accent={accent}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Glance
          icon="mdi:account-group-outline"
          label="Adventurers"
          value={roster.length}
          accent={accent}
        />
        <Glance
          icon="mdi:flag-checkered"
          label="Finished"
          value={finishers}
          accent={accent}
        />
        <Glance
          icon="mdi:check-circle-outline"
          label="Check-ins"
          value={checkIns}
          accent={accent}
        />
        <Glance
          icon="mdi:star-outline"
          label="Points awarded"
          value={roster.reduce((n, p) => n + p.points, 0)}
          accent={accent}
        />
        {signup && (
          <Glance
            icon="mdi:clipboard-check-outline"
            label="Sign-up confirmed"
            value={confirmed}
            accent={accent}
          />
        )}
      </div>

      {signup && signup.unmatched.length > 0 && (
        <section className="mm-glass border-[var(--mm-gold)] p-4">
          <h3 className="flex items-center gap-2 font-medium text-[var(--mm-gold)]">
            <Icon icon="mdi:account-question-outline" width={18} />
            Sign-ups that match nobody
          </h3>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            The form reported these names, but no player here goes by them.
            Usually a typo on the form — worth a word with whoever it was.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {signup.unmatched.map((u) => (
              <li
                key={`${u.handle}-${u.receivedAt.getTime()}`}
                title={`Received ${formatDateTime(u.receivedAt)}${
                  u.externalId ? ` · ref ${u.externalId}` : ""
                }`}
                className="rounded-full border border-[var(--mm-border)] px-2.5 py-1 text-xs"
              >
                {u.handle}
                {u.externalId && (
                  <span className="text-[var(--mm-text-dim)]">
                    {" · "}
                    {u.externalId}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {objectives.length > 0 && (
        <section className="mm-glass p-5">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Icon icon="mdi:map-marker-path" width={20} style={{ color: accent }} />
            Stands on the floor
          </h2>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            How many of the {roster.length}{" "}
            {roster.length === 1 ? "adventurer has" : "adventurers have"} found
            each objective.
          </p>
          <ol className="mt-4 space-y-3">
            {objectives.map((o) => {
              const pct = Math.round((o.completions / field) * 100);
              return (
                <li key={o.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{o.title}</span>
                      {o.hidden && (
                        <Badge color="var(--mm-text-dim)" icon="mdi:eye-off-outline">
                          Hidden
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--mm-text-dim)]">
                      {o.completions}/{roster.length}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--mm-elevated)]"
                    role="meter"
                    aria-valuenow={o.completions}
                    aria-valuemin={0}
                    aria-valuemax={roster.length}
                    aria-label={`${o.title}: ${o.completions} of ${roster.length}`}
                  >
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${pct}%`,
                        background: o.hidden
                          ? "color-mix(in srgb, var(--mm-text-dim) 70%, transparent)"
                          : accent,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {completionsHref && (
        <p className="text-sm text-[var(--mm-text-dim)]">
          <Link
            href={completionsHref}
            className="inline-flex items-center gap-1.5 text-[var(--mm-gold)] hover:underline"
          >
            Open Completions
            <Icon icon="mdi:arrow-right" width={14} />
          </Link>{" "}
          to export the roster, remove mistaken check-ins, or group winners by
          day.
        </p>
      )}
    </div>
  );
}

function Glance({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="mm-glass flex items-center gap-3 p-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${accent}22`, color: accent }}
      >
        <Icon icon={icon} width={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-lg leading-tight tabular-nums">{value}</span>
        <span className="block text-xs leading-tight text-[var(--mm-text-dim)]">
          {label}
        </span>
      </span>
    </div>
  );
}

function EmptyProgress({
  active,
  hasTrail,
  tagsHref,
  printHref,
  accent,
}: {
  active: boolean;
  hasTrail: boolean;
  tagsHref: string;
  printHref: string;
  accent: string;
}) {
  const copy = !hasTrail
    ? {
        title: "No trail yet",
        body: "Add the first objective on the Trail tab. Progress will show here the moment someone checks in.",
      }
    : !active
      ? {
          title: "Waiting to go live",
          body: "The trail is ready, but nobody can check in while this quest is offline. Flip the live switch when the floor is open — adventurers will appear here as they scan.",
        }
      : {
          title: "Waiting for the first sign-in",
          body: "The quest is live. Adventurers appear here as they pick a handle — their check-ins fill in as they scan.",
        };

  return (
    <div className="mm-glass px-6 py-12 text-center">
      <span
        className="mx-auto grid h-12 w-12 place-items-center rounded-2xl"
        style={{ background: `${accent}22`, color: accent }}
      >
        <Icon icon="mdi:account-search-outline" width={24} />
      </span>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg">
        {copy.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--mm-text-dim)]">
        {copy.body}
      </p>
      {hasTrail && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href={tagsHref} className="mm-btn mm-btn-ghost text-sm">
            <Icon icon="mdi:qrcode" width={16} /> Tag sheet
          </Link>
          <Link href={printHref} className="mm-btn mm-btn-ghost text-sm">
            <Icon icon="mdi:printer-outline" width={16} /> Station pack
          </Link>
        </div>
      )}
    </div>
  );
}
