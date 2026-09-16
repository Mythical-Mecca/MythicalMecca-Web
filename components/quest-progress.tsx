import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";
import type {
  AdminObjective,
  QuestParticipant,
  UnmatchedSignup,
} from "@/lib/admin-quests";

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
    return a.lastAt.getTime() - b.lastAt.getTime();
  });
}

function initial(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function QuestProgress({
  objectives,
  participants,
  active,
  tagsHref,
  printHref,
  accent,
  signup = null,
}: {
  objectives: AdminObjective[];
  participants: QuestParticipant[];
  active: boolean;
  tagsHref: string;
  printHref: string;
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

      <section>
        <h2 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:account-star-outline" width={20} style={{ color: accent }} />
          Adventurers
        </h2>
        <p className="mb-3 text-sm text-[var(--mm-text-dim)]">
          Marks follow the trail, left to right. A tick is cleared; an eye is a
          hidden extra they haven&apos;t found yet.
        </p>
        <ol className="space-y-2">
          {roster.map((p, i) => {
            const done = new Set(p.completedStepIds);
            const listedN = listedDone(p, listed);
            const finished = listed.length > 0 && listedN === listed.length;
            return (
              <li key={p.id} className="mm-glass p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                      color: accent,
                    }}
                  >
                    {initial(p.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{p.name}</span>
                      {finished ? (
                        <Badge color="var(--mm-live)" icon="mdi:flag-checkered">
                          Finished
                        </Badge>
                      ) : i === 0 ? (
                        <Badge color={accent}>Leading</Badge>
                      ) : null}
                      {signup && p.signup && (
                        <SignupMark signup={p.signup} label={signup.label} />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--mm-text-dim)]">
                      {listed.length > 0
                        ? `${listedN} of ${listed.length} on the trail`
                        : `${p.completedStepIds.length} cleared`}
                      {p.points > 0 ? ` · ${p.points} pts` : ""}
                      {" · "}
                      last seen {formatDateTime(p.lastAt)}
                    </p>
                    {objectives.length > 0 && (
                      <ol className="mt-2.5 flex flex-wrap gap-1.5">
                        {objectives.map((o) => {
                          const cleared = done.has(o.id);
                          const label = `${o.title}${
                            cleared ? " — done" : " — still open"
                          }${o.hidden ? " (hidden)" : ""}`;
                          return (
                            <li key={o.id}>
                              <span
                                title={label}
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[10px] font-semibold tabular-nums ${
                                  cleared
                                    ? "text-[var(--mm-text)]"
                                    : "text-[var(--mm-text-dim)]"
                                }`}
                                style={{
                                  background: cleared
                                    ? `color-mix(in srgb, ${accent} 22%, transparent)`
                                    : "var(--mm-elevated)",
                                  boxShadow: o.hidden
                                    ? "inset 0 0 0 1px color-mix(in srgb, var(--mm-text-dim) 45%, transparent)"
                                    : cleared
                                      ? `inset 0 0 0 1px color-mix(in srgb, ${accent} 45%, transparent)`
                                      : undefined,
                                }}
                              >
                                <span className="sr-only">{label}</span>
                                {cleared ? (
                                  <Icon icon="mdi:check" width={12} />
                                ) : o.hidden ? (
                                  <Icon icon="mdi:eye-off-outline" width={12} />
                                ) : (
                                  <Icon icon="mdi:circle-small" width={12} />
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/**
 * Where one adventurer stands with the external form. Three states, and
 * "claimed" is deliberately not green: it is their word, and the organiser
 * handing out a prize is the one who has to decide how much that is worth.
 */
function SignupMark({
  signup,
  label,
}: {
  signup: NonNullable<QuestParticipant["signup"]>;
  label: string;
}) {
  if (signup.state === "confirmed") {
    return (
      <Badge
        color="var(--mm-live)"
        icon="mdi:clipboard-check-outline"
        title={signup.externalId ? `${label} · ref ${signup.externalId}` : label}
      >
        Signed up
        {signup.externalId && (
          <span className="ml-1 font-mono text-[10px] opacity-80">
            {signup.externalId}
          </span>
        )}
      </Badge>
    );
  }
  if (signup.state === "claimed") {
    return (
      <Badge color="var(--mm-gold)" icon="mdi:clipboard-text-outline" title={`${label} · their word, not confirmed`}>
        Says signed up
      </Badge>
    );
  }
  return (
    <Badge icon="mdi:clipboard-off-outline" title={`${label} · nothing yet`}>
      No sign-up
    </Badge>
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
          title: "Waiting for the first scan",
          body: "The quest is live. The first adventurer who checks in will show up here, with how far they have got and when they last scanned.",
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
