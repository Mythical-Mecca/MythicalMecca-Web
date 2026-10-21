import Link from "next/link";
import { auth } from "@/lib/auth";
import { listMyPartners } from "@/lib/partner-access";
import { listPendingInvitesForUser } from "@/lib/partner-invites";
import { stationsForPartner } from "@/lib/hunts";
import { listPartnerEvents } from "@/lib/partner";
import { acceptPartnerInviteById } from "../actions";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { PartnerStatusBadge } from "@/components/partner-status-badge";
import { withReturn } from "@/lib/return-to";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Partner Hub" };

export default async function PartnerHubPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; saved?: string }>;
}) {
  const session = await auth();
  const [memberships, stations, pendingInvites] = await Promise.all([
    listMyPartners(session!.user.id),
    stationsForPartner(session!.user.id),
    // Invitations addressed to this account show up here directly, which is how
    // an invite reaches an existing member with no mail provider configured.
    listPendingInvitesForUser(session!.user.id, session!.user.email ?? null),
  ]);
  const { denied } = await searchParams;

  // On event day the running quest is the only thing that matters here, so it
  // goes above everything else — a partner mid-sale shouldn't have to hunt.
  const liveStations = stations.filter((s) => s.open);
  const canCreate = memberships.some((m) => m.status === "approved");

  // Fetch partner events for all user's stalls to surface in Event Application section
  const eventsByStall = await Promise.all(
    memberships.map(async (m) => {
      const items = await listPartnerEvents(m.partnerId);
      return items.map((e) => ({
        ...e,
        partnerId: m.partnerId,
        stallName: m.businessName,
      }));
    })
  );
  const allEvents = eventsByStall.flat();
  const now = Date.now();

  const primaryStall = memberships[0];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide sm:text-3xl">
            Partner <span className="mm-gradient-text">Hub</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
            Manage your listed stalls and submit event applications for the calendar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryStall && (
            <Link
              href={`/partner-hub/${primaryStall.partnerId}/events#new-event`}
              className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Icon icon="mdi:calendar-plus" width={16} />
              <span>Submit Event Application</span>
            </Link>
          )}
          <Link
            href="/partner-hub/new"
            className="mm-btn mm-btn-ghost text-xs sm:text-sm font-medium border border-[var(--mm-border)] hover:border-[var(--mm-gold)]"
          >
            <Icon icon="mdi:plus" width={16} />
            <span>Add new stall</span>
          </Link>
        </div>
      </div>

      {denied && (
        <Flash tone="error">
          You don&apos;t have access to that stall.
        </Flash>
      )}

      {pendingInvites.length > 0 && (
        <section className="mm-glass border-[var(--mm-violet)] p-5">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Icon
              icon="mdi:account-plus-outline"
              width={20}
              className="text-[var(--mm-violet)]"
            />
            {pendingInvites.length === 1
              ? "You have an invitation"
              : "You have invitations"}
          </h2>
          <div className="mt-3 space-y-2">
            {pendingInvites.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-3"
              >
                <span className="min-w-0 text-sm">
                  <span className="text-[var(--mm-text)]">{i.partnerName}</span>
                  <span className="text-[var(--mm-text-dim)]">
                    {" "}
                    · as {i.role === "owner" ? "owner" : "manager"}
                  </span>
                </span>
                <form action={acceptPartnerInviteById}>
                  <input type="hidden" name="inviteId" value={i.id} />
                  <button className="mm-btn mm-btn-primary text-xs">
                    <Icon icon="mdi:check" width={14} /> Accept
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {liveStations.length > 0 && (
        <section className="mm-glass border-[var(--mm-live)] p-5">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Icon
              icon="game-icons:treasure-map"
              width={20}
              className="text-[var(--mm-live)]"
            />
            Quest running now
          </h2>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Open your station and leave it on the counter. Adventurers scan it
            to check in.
          </p>
          <div className="mt-4 space-y-2">
            {liveStations.map((s) => (
              <Link
                key={s.stepId}
                href={withReturn(`/partner-hub/station/${s.stepId}`, { href: "/partner-hub", label: "Partner hub" })}
                className="mm-btn mm-btn-primary flex w-full items-center justify-between py-4"
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="truncate text-base">Open station</span>
                  <span className="truncate text-xs opacity-80">
                    {/* Labelled by stall — a user may staff several. */}
                    {s.partnerName} · {s.questTitle} · {s.objectiveTitle}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge solid color="var(--mm-gold)">
                    {s.checkIns}
                  </Badge>
                  <Icon icon="mdi:chevron-right" width={20} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- EVENT APPLICATION SECTION ---------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-white">
              <Icon icon="mdi:calendar-plus" width={22} className="text-[var(--mm-gold)]" />
              <span>Event Application</span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--mm-gold)_15%,transparent)] border border-[color-mix(in_srgb,var(--mm-gold)_30%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--mm-gold)]">
                Calendar
              </span>
            </h2>
            <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
              Schedule tournaments, workshops, showcases, or gatherings for your stall on the communal calendar.
            </p>
          </div>
          {primaryStall && (
            <Link
              href={`/partner-hub/${primaryStall.partnerId}/events#new-event`}
              className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold"
            >
              <Icon icon="mdi:plus-circle-outline" width={16} />
              <span>New Event Application</span>
            </Link>
          )}
        </div>

        {/* Event Application Card & Events Overview */}
        <div className="mm-glass rounded-2xl border border-[color-mix(in_srgb,var(--mm-gold)_30%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_70%,transparent)] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[var(--mm-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--mm-gold)]">
                <Icon icon="game-icons:campfire" width={14} />
                <span>Host on the Community Calendar</span>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg text-white">
                Submit an Event Application for your Stall
              </h3>
              <p className="text-xs sm:text-sm text-[var(--mm-text-dim)] leading-relaxed">
                As an approved partner, your events appear directly on the communal calendar and your stall page. Provide event title, date, time, and details to publish for adventurers.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:shrink-0">
              {memberships.length === 1 ? (
                <Link
                  href={`/partner-hub/${memberships[0].partnerId}/events#new-event`}
                  className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold justify-center"
                >
                  <Icon icon="mdi:calendar-plus" width={16} />
                  <span>Submit Event Application</span>
                </Link>
              ) : memberships.length > 1 ? (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--mm-text-dim)]">
                    Select Stall to Apply:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {memberships.map((m) => (
                      <Link
                        key={m.partnerId}
                        href={`/partner-hub/${m.partnerId}/events#new-event`}
                        className="mm-btn mm-btn-ghost text-xs justify-start hover:border-[var(--mm-gold)]"
                      >
                        <Icon icon="game-icons:shop" width={14} className="text-[var(--mm-gold)]" />
                        <span className="truncate">Apply for {m.businessName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[var(--mm-text-dim)]">
                    Create a stall first to submit events to the calendar.
                  </span>
                  <Link
                    href="/partner-hub/new"
                    className="mm-btn mm-btn-primary text-xs font-semibold"
                  >
                    <Icon icon="mdi:plus" width={14} /> Create Stall
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Existing submitted events list */}
          <div className="mt-6 border-t border-[var(--mm-divider)] pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase tracking-widest font-semibold text-[var(--mm-text-dim)]">
                Your Scheduled Calendar Gatherings ({allEvents.length})
              </h4>
              {primaryStall && (
                <Link
                  href={`/partner-hub/${primaryStall.partnerId}/events`}
                  className="text-xs text-[var(--mm-gold)] hover:underline"
                >
                  Manage all events →
                </Link>
              )}
            </div>

            {allEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_50%,transparent)] p-6 text-center">
                <p className="text-xs sm:text-sm text-[var(--mm-text-dim)]">
                  No event applications submitted yet. Fill out the application form to host your next gathering!
                </p>
                {primaryStall && (
                  <Link
                    href={`/partner-hub/${primaryStall.partnerId}/events#new-event`}
                    className="mm-btn mm-btn-ghost mt-3 text-xs inline-flex items-center gap-1.5"
                  >
                    <Icon icon="mdi:calendar-plus" width={14} />
                    <span>Create first event</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {allEvents.slice(0, 4).map((e) => {
                  const startMs = new Date(e.startsAt).getTime();
                  const endMs = new Date(e.endsAt).getTime();
                  const isLive = now >= startMs && now <= endMs;
                  const isUpcoming = startMs > now;

                  return (
                    <div
                      key={e.id}
                      className="rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-3.5 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-[var(--mm-text-dim)]">
                            {e.stallName}
                          </span>
                          {isLive && (
                            <Badge color="var(--mm-live)" dot>
                              Live
                            </Badge>
                          )}
                          {isUpcoming && (
                            <Badge color="var(--mm-gold)">Upcoming</Badge>
                          )}
                          {!isLive && !isUpcoming && (
                            <Badge color="var(--mm-text-dim)">Ended</Badge>
                          )}
                        </div>
                        <h5 className="font-semibold text-sm text-white mt-1 truncate">
                          {e.title}
                        </h5>
                        <p className="text-xs text-[var(--mm-gold)] mt-0.5 flex items-center gap-1">
                          <Icon icon="mdi:clock-outline" width={13} />
                          {formatDateTime(e.startsAt)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--mm-divider)] text-xs">
                        {e.location ? (
                          <span className="text-[var(--mm-text-dim)] truncate max-w-[150px]">
                            {e.location}
                          </span>
                        ) : (
                          <span className="text-[var(--mm-text-dim)]">Communal Hearth</span>
                        )}
                        <Link
                          href={`/partner-hub/${e.partnerId}/events`}
                          className="text-[var(--mm-gold)] hover:underline shrink-0"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- CURRENTLY LISTED STALLS SECTION ---------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-white">
              <Icon icon="game-icons:shop" width={22} className="text-[var(--mm-gold)]" />
              <span>Your Listed Stalls</span>
              <span className="rounded-full bg-[var(--mm-elevated)] px-2.5 py-0.5 text-xs text-[var(--mm-text-dim)]">
                {memberships.length}
              </span>
            </h2>
            <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
              Your stalls, shopfronts, and partner profiles in the Mythical Mecca bazaar.
            </p>
          </div>
          <Link
            href="/partner-hub/new"
            className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold shadow-sm"
          >
            <Icon icon="mdi:plus" width={16} />
            <span>Add New Stall</span>
          </Link>
        </div>

        {memberships.length === 0 ? (
          <div className="mm-glass rounded-2xl border border-dashed border-[var(--mm-gold)] p-8 text-center space-y-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--mm-elevated)] text-[var(--mm-gold)] mx-auto">
              <Icon icon="game-icons:shop" width={28} />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg text-white">
              No stalls listed yet
            </h3>
            <p className="max-w-md mx-auto text-xs sm:text-sm text-[var(--mm-text-dim)]">
              Create your stall to start listing products, showcasing your gallery, and publishing events to the community calendar.
            </p>
            <Link href="/partner-hub/new" className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 mt-2">
              <Icon icon="mdi:plus" width={16} />
              <span>Create Your First Stall</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {memberships.map((m) => (
              <div
                key={m.partnerId}
                className="mm-glass rounded-2xl p-5 border border-[var(--mm-border)] hover:border-[var(--mm-gold)]/60 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mm-elevated)] text-[var(--mm-gold)]">
                        <Icon icon="game-icons:shop" width={24} />
                      </div>
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-lg text-white font-medium">
                          {m.businessName}
                        </h3>
                        <span className="text-xs text-[var(--mm-text-dim)]">
                          /{m.slug}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <PartnerStatusBadge status={m.status} />
                      {m.role === "owner" && (
                        <Badge color="var(--mm-violet)" icon="mdi:key-variant">
                          Owner
                        </Badge>
                      )}
                      {!m.active && (
                        <Badge color="var(--mm-danger)" icon="mdi:pause-circle-outline">
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Quick Actions for this Store */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--mm-divider)]">
                  <Link
                    href={`/partner-hub/${m.partnerId}/profile`}
                    className="mm-btn mm-btn-primary text-xs font-semibold justify-center py-2 shadow-sm"
                  >
                    <Icon icon="mdi:store-edit-outline" width={15} />
                    <span>Edit Store</span>
                  </Link>
                  <Link
                    href={`/partner-hub/${m.partnerId}/events#new-event`}
                    className="mm-btn text-xs font-semibold justify-center py-2 bg-[color-mix(in_srgb,var(--mm-gold)_16%,transparent)] text-[var(--mm-gold)] hover:bg-[color-mix(in_srgb,var(--mm-gold)_28%,transparent)] border border-[color-mix(in_srgb,var(--mm-gold)_35%,transparent)] transition"
                  >
                    <Icon icon="mdi:calendar-plus" width={15} />
                    <span>Add Event</span>
                  </Link>
                </div>

                {/* Secondary Hub Sub-Links */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--mm-divider)] text-xs text-[var(--mm-text-dim)]">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/partner-hub/${m.partnerId}/offerings`}
                      className="inline-flex items-center gap-1 hover:text-[var(--mm-gold)] transition-colors"
                    >
                      <Icon icon="mdi:tag-outline" width={13} />
                      <span>Offerings</span>
                    </Link>
                    <span>·</span>
                    <Link
                      href={`/partner-hub/${m.partnerId}/gallery`}
                      className="inline-flex items-center gap-1 hover:text-[var(--mm-gold)] transition-colors"
                    >
                      <Icon icon="mdi:image-outline" width={13} />
                      <span>Gallery</span>
                    </Link>
                  </div>
                  <Link
                    href={`/partner-hub/${m.partnerId}`}
                    className="inline-flex items-center gap-1 text-[var(--mm-gold)] font-medium hover:underline ml-auto"
                  >
                    <span>Manage Stall →</span>
                  </Link>
                </div>
              </div>
            ))}

            {/* Add Another Stall card */}
            <Link
              href="/partner-hub/new"
              className="rounded-2xl border-2 border-dashed border-[var(--mm-border)] hover:border-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-surface)_40%,transparent)] hover:bg-[var(--mm-elevated)] p-6 flex flex-col items-center justify-center text-center gap-2 transition group min-h-[160px]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mm-surface)] text-[var(--mm-text-dim)] group-hover:text-[var(--mm-gold)] group-hover:scale-105 transition">
                <Icon icon="mdi:plus" width={22} />
              </div>
              <span className="font-[family-name:var(--font-display)] text-sm text-white group-hover:text-[var(--mm-gold)] transition-colors">
                Add Another Stall
              </span>
              <span className="text-xs text-[var(--mm-text-dim)] max-w-xs">
                Open a new vendor shopfront, artist page, or collaborator profile in the bazaar.
              </span>
            </Link>
          </div>
        )}
      </section>

      {stations.length > 0 && liveStations.length === 0 && (
        <section className="mm-glass p-5 rounded-2xl">
          <h2 className="flex items-center gap-2 font-medium">
            <Icon
              icon="game-icons:treasure-map"
              width={18}
              className="text-[var(--mm-text-dim)]"
            />
            Your quest stations
          </h2>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Nothing running right now. Your station goes live when the quest does.
          </p>
          <div className="mt-3 space-y-1.5">
            {stations.map((s) => (
              <Link
                key={s.stepId}
                href={withReturn(`/partner-hub/station/${s.stepId}`, { href: "/partner-hub", label: "Partner hub" })}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-surface)] hover:text-[var(--mm-text)]"
              >
                <span className="truncate">
                  {s.partnerName} · {s.questTitle} · {s.objectiveTitle}
                </span>
                <Icon icon="mdi:chevron-right" width={16} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
