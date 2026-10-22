import Link from "next/link";
import { auth } from "@/lib/auth";
import { listMyPartners } from "@/lib/partner-access";
import { listPendingInvitesForUser } from "@/lib/partner-invites";
import { stationsForPartner } from "@/lib/hunts";
import { listMySubmittedEvents } from "@/lib/partner";
import {
  acceptPartnerInviteById,
  createPartnerEvent,
  deletePartnerEvent,
  submitPartnerForReview,
} from "../actions";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { PartnerStatusBadge } from "@/components/partner-status-badge";
import { TextField, TextareaField, FormCard } from "@/components/form";
import { withReturn } from "@/lib/return-to";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Partner Hub" };

export default async function PartnerHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    denied?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    submitted?: string;
  }>;
}) {
  const session = await auth();
  const [memberships, stations, pendingInvites] = await Promise.all([
    listMyPartners(session!.user.id),
    stationsForPartner(session!.user.id),
    listPendingInvitesForUser(session!.user.id, session!.user.email ?? null),
  ]);
  const { tab, denied, saved, deleted, error, submitted } = await searchParams;
  const currentTab = tab === "events" ? "events" : "stalls";

  const liveStations = stations.filter((s) => s.open);

  // Fetch partner events for all user's stalls and events created by this partner user
  const allEvents = await listMySubmittedEvents(
    session!.user.id,
    memberships.map((m) => m.partnerId)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide sm:text-3xl">
            Partner <span className="mm-gradient-text">Hub</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
            Manage stalls linked to your account and submit events for calendar approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentTab === "stalls" ? (
            <Link
              href="/partner-hub/new"
              className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Icon icon="mdi:plus" width={16} />
              <span>Add New Stall</span>
            </Link>
          ) : (
            <a
              href="#new-event"
              className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Icon icon="mdi:calendar-plus" width={16} />
              <span>Submit Event</span>
            </a>
          )}
        </div>
      </div>

      {denied && (
        <Flash tone="error">
          You don&apos;t have access to that stall.
        </Flash>
      )}
      {submitted && (
        <Flash tone="success">
          Stall submitted for admin review! An administrator will evaluate and approve it for the public directory.
        </Flash>
      )}
      {saved && (
        <Flash tone="success">
          Event submitted! It is now pending admin review and will appear on the calendar once approved.
        </Flash>
      )}
      {deleted && <Flash>Event removed.</Flash>}
      {error && (
        <Flash tone="error">
          {error === "validation" && "Please provide a valid title and both start/end times."}
          {error === "end_before_start" && "Event end time must be after the start time."}
          {error === "invalid_dates" && "Please select valid start and end dates/times."}
          {!["validation", "end_before_start", "invalid_dates"].includes(error) &&
            "Could not save event. Please check details and try again."}
        </Flash>
      )}

      {pendingInvites.length > 0 && (
        <section className="mm-glass border-[var(--mm-violet)] p-5 rounded-2xl">
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
          <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
            Someone has invited you to help manage their stall.
          </p>
          <div className="mt-4 divide-y divide-[var(--mm-divider)]">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-white">{inv.partnerName}</p>
                  <p className="text-xs text-[var(--mm-text-dim)]">
                    Role: <span className="capitalize text-[var(--mm-gold)]">{inv.role}</span>
                  </p>
                </div>
                <form action={acceptPartnerInviteById}>
                  <input type="hidden" name="inviteId" value={inv.id} />
                  <button type="submit" className="mm-btn mm-btn-primary text-xs">
                    Accept invitation
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2 Primary Tabs: Manage Stalls vs Event Management */}
      <div className="flex border-b border-[var(--mm-border)]">
        <Link
          href="/partner-hub?tab=stalls"
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            currentTab === "stalls"
              ? "border-[var(--mm-blue)] text-white bg-[color-mix(in_srgb,var(--mm-blue)_10%,transparent)]"
              : "border-transparent text-[var(--mm-text-dim)] hover:border-[var(--mm-border)] hover:text-[var(--mm-text)]"
          }`}
        >
          <Icon
            icon="game-icons:shop"
            width={18}
            className={currentTab === "stalls" ? "text-[var(--mm-blue)]" : undefined}
          />
          <span>Manage Stalls</span>
          <span className="rounded-full bg-[var(--mm-elevated)] px-2 py-0.5 text-xs text-[var(--mm-text-dim)]">
            {memberships.length}
          </span>
        </Link>
        <Link
          href="/partner-hub?tab=events"
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            currentTab === "events"
              ? "border-[var(--mm-gold)] text-white bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)]"
              : "border-transparent text-[var(--mm-text-dim)] hover:border-[var(--mm-border)] hover:text-[var(--mm-text)]"
          }`}
        >
          <Icon
            icon="mdi:calendar-month-outline"
            width={18}
            className={currentTab === "events" ? "text-[var(--mm-gold)]" : undefined}
          />
          <span>Event Management</span>
          <span className="rounded-full bg-[var(--mm-elevated)] px-2 py-0.5 text-xs text-[var(--mm-text-dim)]">
            {allEvents.length}
          </span>
        </Link>
      </div>

      {/* ---------------- TAB 1: MANAGE STALLS ---------------- */}
      {currentTab === "stalls" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-white">
                <Icon icon="game-icons:shop" width={22} className="text-[var(--mm-blue)]" />
                <span>Your Listed Stalls</span>
                <span className="rounded-full bg-[var(--mm-elevated)] px-2.5 py-0.5 text-xs text-[var(--mm-text-dim)]">
                  {memberships.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
                Stalls and artisan profiles linked to your email. Edit your storefront, offerings, and gallery.
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

          {/* Admin Moderation Notice */}
          <div className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--mm-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_50%,transparent)] p-4 text-xs text-[var(--mm-text-dim)]">
            <Icon icon="mdi:shield-check-outline" width={18} className="shrink-0 text-[var(--mm-blue)] mt-0.5" />
            <p>
              <strong className="text-white">Admin Approval Required:</strong> All newly added stalls stay in <span className="text-amber-300 font-semibold">Draft</span> or <span className="text-amber-300 font-semibold">Pending</span> status. Stalls do not appear on the public directory until reviewed and approved by an administrator.
            </p>
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
                Create a stall to start listing products, showcasing your gallery, and promoting your offerings.
              </p>
              <Link
                href="/partner-hub/new"
                className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 mt-2"
              >
                <Icon icon="mdi:plus" width={16} />
                <span>Create Your First Stall</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {memberships.map((m) => {
                const canSubmitReview =
                  m.role === "owner" && (m.status === "draft" || m.status === "rejected");

                return (
                  <div
                    key={m.partnerId}
                    className="mm-glass rounded-2xl p-5 border border-[var(--mm-border)] hover:border-[var(--mm-blue)]/60 transition-colors flex flex-col justify-between gap-4"
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

                    {/* Quick Edit Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--mm-divider)]">
                      <Link
                        href={`/partner-hub/${m.partnerId}/profile`}
                        className="mm-btn mm-btn-primary text-xs font-semibold justify-center py-2 shadow-sm"
                      >
                        <Icon icon="mdi:store-edit-outline" width={15} />
                        <span>Edit Store</span>
                      </Link>
                      <Link
                        href={`/partner-hub?tab=events&stall=${m.partnerId}#new-event`}
                        className="mm-btn text-xs font-semibold justify-center py-2 bg-[color-mix(in_srgb,var(--mm-gold)_16%,transparent)] text-[var(--mm-gold)] hover:bg-[color-mix(in_srgb,var(--mm-gold)_28%,transparent)] border border-[color-mix(in_srgb,var(--mm-gold)_35%,transparent)] transition"
                      >
                        <Icon icon="mdi:calendar-plus" width={15} />
                        <span>Add Event</span>
                      </Link>
                    </div>

                    {/* Secondary Management Links */}
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

                    {/* Submit for Review Action if Draft */}
                    {canSubmitReview && (
                      <form action={submitPartnerForReview} className="pt-2 border-t border-[var(--mm-divider)]">
                        <input type="hidden" name="partnerId" value={m.partnerId} />
                        <button
                          type="submit"
                          className="mm-btn mm-btn-ghost w-full text-xs text-[var(--mm-gold)] border border-[var(--mm-gold)]/30 hover:bg-[color-mix(in_srgb,var(--mm-gold)_12%,transparent)]"
                        >
                          <Icon icon="mdi:send-outline" width={14} /> Submit Stall for Admin Review
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}

              {/* Add Another Stall card */}
              <Link
                href="/partner-hub/new"
                className="rounded-2xl border-2 border-dashed border-[var(--mm-border)] hover:border-[var(--mm-blue)] bg-[color-mix(in_srgb,var(--mm-surface)_40%,transparent)] hover:bg-[var(--mm-elevated)] p-6 flex flex-col items-center justify-center text-center gap-2 transition group min-h-[160px]"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mm-surface)] text-[var(--mm-text-dim)] group-hover:text-[var(--mm-blue)] group-hover:scale-105 transition">
                  <Icon icon="mdi:plus" width={22} />
                </div>
                <span className="font-[family-name:var(--font-display)] text-sm text-white group-hover:text-[var(--mm-blue)] transition-colors">
                  Add Another Stall
                </span>
                <span className="text-xs text-[var(--mm-text-dim)] max-w-xs">
                  Create another stall, artist showcase, or vendor shopfront linked to your account.
                </span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 2: EVENT MANAGEMENT ---------------- */}
      {currentTab === "events" && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-white">
                <Icon icon="mdi:calendar-month-outline" width={22} className="text-[var(--mm-gold)]" />
                <span>Event Management</span>
                <span className="rounded-full bg-[var(--mm-elevated)] px-2.5 py-0.5 text-xs text-[var(--mm-text-dim)]">
                  {allEvents.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-[var(--mm-text-dim)] sm:text-sm">
                Submit tournaments, showcases, workshops, and gatherings. No stall required to submit an event.
              </p>
            </div>
            <a
              href="#new-event"
              className="mm-btn mm-btn-primary text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Icon icon="mdi:plus-circle-outline" width={16} />
              <span>Submit New Event</span>
            </a>
          </div>

          {/* Admin Moderation Notice */}
          <div className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--mm-gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)] p-4 text-xs text-[var(--mm-text-dim)]">
            <Icon icon="mdi:clock-outline" width={18} className="shrink-0 text-[var(--mm-gold)] mt-0.5" />
            <p>
              <strong className="text-white">Admin Approval Required:</strong> All partner events are submitted as <span className="text-amber-300 font-semibold">Pending Review</span>. An administrator must approve your event in the moderation queue before it goes live on the calendar.
            </p>
          </div>

          {/* Submitted Events List */}
          <section className="space-y-4">
            <h3 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-white">
              Your Submitted Events ({allEvents.length})
            </h3>

            {allEvents.length === 0 ? (
              <div className="mm-glass flex flex-col items-center justify-center rounded-2xl p-8 sm:p-12 text-center text-[var(--mm-text-dim)]">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--mm-elevated)] text-[var(--mm-gold)]">
                  <Icon icon="game-icons:campfire" width={32} />
                </div>
                <h4 className="mt-4 font-[family-name:var(--font-display)] text-lg text-white">
                  No events submitted yet
                </h4>
                <p className="mt-1.5 max-w-sm text-xs sm:text-sm">
                  Use the form below to submit a tournament, workshop, or gathering for administrator approval.
                </p>
                <a href="#new-event" className="mm-btn mm-btn-primary mt-5 text-xs font-semibold">
                  <Icon icon="mdi:calendar-plus" width={15} /> Create your first event
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {allEvents.map((e) => {
                  const isApproved = e.status === "published" || e.status === "live";
                  const isPending = e.status === "pending";

                  return (
                    <div
                      key={e.id}
                      className="mm-glass rounded-2xl border border-[var(--mm-border)] p-4 sm:p-5 transition hover:border-[var(--mm-gold)]/60"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-medium text-white">
                              {e.title}
                            </h4>
                            {isPending && (
                              <Badge color="#E18D01" icon="mdi:clock-outline">
                                Pending Review
                              </Badge>
                            )}
                            {isApproved && (
                              <Badge color="#5cc08c" icon="mdi:check-circle-outline">
                                Approved &amp; Live
                              </Badge>
                            )}
                            {e.status === "draft" && (
                              <Badge color="#a0aab8" icon="mdi:pencil-outline">
                                Draft
                              </Badge>
                            )}
                            {e.status === "rejected" && (
                              <Badge color="#f87171" icon="mdi:close-circle-outline">
                                Rejected
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--mm-text-dim)]">
                            {e.stallName ? (
                              <span className="flex items-center gap-1 font-medium text-[var(--mm-gold)]">
                                <Icon icon="game-icons:shop" width={13} />
                                <span>{e.stallName}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[var(--mm-text-dim)]">
                                <Icon icon="mdi:account-outline" width={13} />
                                <span>Partner Event</span>
                              </span>
                            )}
                            {e.startsAt && (
                              <span className="flex items-center gap-1">
                                <Icon icon="mdi:calendar-start" width={13} />
                                <span>{formatDateTime(e.startsAt)}</span>
                              </span>
                            )}
                            {e.location && (
                              <span className="flex items-center gap-1">
                                <Icon icon="mdi:map-marker" width={13} />
                                <span>{e.location}</span>
                              </span>
                            )}
                          </div>

                          {e.summary && (
                            <p className="text-xs text-[var(--mm-text)] line-clamp-2 mt-1">
                              {e.summary}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isApproved && e.slug && (
                            <Link
                              href={`/events/${e.slug}`}
                              className="mm-btn mm-btn-ghost text-xs"
                            >
                              <Icon icon="mdi:open-in-new" width={14} /> View
                            </Link>
                          )}
                          <form action={deletePartnerEvent}>
                            <input type="hidden" name="eventId" value={e.id} />
                            <input type="hidden" name="returnTo" value="hub" />
                            <button
                              type="submit"
                              className="mm-btn mm-btn-ghost text-xs text-[var(--mm-danger)] hover:bg-[color-mix(in_srgb,var(--mm-danger)_15%,transparent)]"
                            >
                              <Icon icon="mdi:trash-can-outline" width={14} />
                              <span>Delete</span>
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Add New Event Form (No stall required!) */}
          <section id="new-event" className="scroll-mt-24 pt-4">
            <FormCard
              title="Submit Event for Admin Approval"
              icon="mdi:calendar-plus"
              accent="#E18D01"
            >
              <form action={createPartnerEvent} className="space-y-5">
                <input type="hidden" name="returnTo" value="hub" />

                {/* Optional Stall Selector */}
                {memberships.length > 0 && (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--mm-text-dim)]">
                      <Icon icon="game-icons:shop" width={14} className="text-[var(--mm-gold)]" />
                      <span>Associated Stall (Optional)</span>
                    </label>
                    <select
                      name="partnerId"
                      className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--mm-gold)]"
                    >
                      <option value="none">None (General Partner Event)</option>
                      {memberships.map((m) => (
                        <option key={m.partnerId} value={m.partnerId}>
                          {m.businessName} (/{m.slug})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-[var(--mm-text-dim)]">
                      Link this event to one of your stalls, or leave as General Partner Event.
                    </p>
                  </div>
                )}

                <TextField
                  name="title"
                  label="Event title"
                  icon="mdi:format-title"
                  placeholder="e.g., Warhammer 40k Paint & Play, Magic Draft, Cosplay Workshop"
                  required
                  maxLength={120}
                />

                <TextField
                  name="summary"
                  label="Short summary"
                  icon="mdi:text-short"
                  placeholder="1-2 sentences shown on calendar cards and previews"
                  maxLength={300}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--mm-text-dim)]">
                      <Icon icon="mdi:calendar-start" width={14} className="text-[var(--mm-gold)]" />
                      <span>Starts at</span>
                      <span className="text-[var(--mm-danger)]">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="startsAt"
                      required
                      className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--mm-gold)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--mm-text-dim)]">
                      <Icon icon="mdi:calendar-end" width={14} className="text-[var(--mm-gold)]" />
                      <span>Ends at</span>
                      <span className="text-[var(--mm-danger)]">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="endsAt"
                      required
                      className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--mm-gold)]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    name="location"
                    label="Location / Table"
                    icon="mdi:map-marker-outline"
                    placeholder="e.g., Table 4, Main Stage, Workshop Tent B"
                    maxLength={160}
                  />

                  <TextField
                    name="externalUrl"
                    label="External Link / Registration"
                    icon="mdi:link-variant"
                    placeholder="https://..."
                    maxLength={500}
                  />
                </div>

                <TextareaField
                  name="bodyMd"
                  label="Event details & description"
                  placeholder="Detailed rules, schedule, prizes, entry fee, or requirements..."
                  rows={4}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--mm-border)]">
                  <p className="text-xs text-[var(--mm-text-dim)]">
                    All partner events require admin moderation before publication on the calendar.
                  </p>
                  <button
                    type="submit"
                    className="mm-btn mm-btn-primary text-sm font-semibold shadow-sm"
                  >
                    <Icon icon="mdi:send-outline" width={16} />
                    <span>Submit Event for Review</span>
                  </button>
                </div>
              </form>
            </FormCard>
          </section>
        </div>
      )}

      {/* Quest Stations */}
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
                href={withReturn(`/partner-hub/station/${s.stepId}`, {
                  href: "/partner-hub",
                  label: "Partner hub",
                })}
                className="flex items-center justify-between rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-xs transition hover:border-[var(--mm-gold)]"
              >
                <span>{s.huntTitle}</span>
                <span className="text-[var(--mm-text-dim)]">{s.instruction} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
