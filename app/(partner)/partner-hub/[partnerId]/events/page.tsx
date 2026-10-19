import { notFound } from "next/navigation";
import Link from "next/link";
import { getPartnerForHub, listPartnerEvents } from "@/lib/partner";
import { createPartnerEvent, deletePartnerEvent } from "../../../actions";
import { TextField, TextareaField, FormCard } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { formatDateTime } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  return { title: `${partner?.businessName ?? "Stall"} · Events` };
}

export default async function StallEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  if (!partner) notFound();

  const partnerEvents = await listPartnerEvents(partner.id);
  const { saved, deleted, error } = await searchParams;

  const now = Date.now();

  return (
    <div className="max-w-3xl space-y-8">
      {saved && (
        <Flash tone="success">
          Event published! It is now live on the communal calendar and your stall page.
        </Flash>
      )}
      {deleted && <Flash>Event removed from the calendar.</Flash>}
      {error && (
        <Flash tone="error">
          {error === "validation" && "Please provide a valid title and both start/end times."}
          {error === "end_before_start" && "Event end time must be after the start time."}
          {error === "invalid_dates" && "Please select valid start and end dates/times."}
          {!["validation", "end_before_start", "invalid_dates"].includes(error) &&
            "Could not save event. Please check details and try again."}
        </Flash>
      )}

      {/* Intro banner */}
      <div className="mm-glass rounded-2xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-white">
              <Icon icon="game-icons:campfire" width={22} className="text-[var(--mm-gold)]" />
              <span>Partner Events</span>
              <span className="rounded-full bg-[var(--mm-elevated)] px-2.5 py-0.5 text-xs text-[var(--mm-text-dim)]">
                {partnerEvents.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[var(--mm-text-dim)] max-w-xl">
              Host a tournament, workshop, showcase, or meetup. All events published here appear on the main community calendar and your stall page.
            </p>
          </div>
          <a
            href="#new-event"
            className="mm-btn mm-btn-primary shrink-0 self-start sm:self-auto text-xs sm:text-sm font-semibold"
          >
            <Icon icon="mdi:calendar-plus" width={16} />
            <span>Add new event</span>
          </a>
        </div>
      </div>

      {/* Events List */}
      <section className="space-y-4">
        <h3 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-white">
          Your Scheduled Gatherings
        </h3>

        {partnerEvents.length === 0 ? (
          <div className="mm-glass flex flex-col items-center justify-center rounded-2xl p-8 sm:p-12 text-center text-[var(--mm-text-dim)]">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--mm-elevated)] text-[var(--mm-gold)]">
              <Icon icon="game-icons:campfire" width={32} />
            </div>
            <h4 className="mt-4 font-[family-name:var(--font-display)] text-lg text-white">
              No events scheduled yet
            </h4>
            <p className="mt-1.5 max-w-sm text-xs sm:text-sm">
              Publishing an event puts your stall on the main calendar so adventurers know when to visit.
            </p>
            <a href="#new-event" className="mm-btn mm-btn-primary mt-5 text-xs">
              <Icon icon="mdi:calendar-plus" width={15} /> Create your first event
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {partnerEvents.map((e) => {
              const startMs = new Date(e.startsAt).getTime();
              const endMs = new Date(e.endsAt).getTime();
              const isLive = now >= startMs && now <= endMs;
              const isUpcoming = startMs > now;

              return (
                <div
                  key={e.id}
                  className="mm-glass mm-panel rounded-2xl p-4 sm:p-5 transition hover:border-[var(--mm-gold)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isLive && (
                          <Badge color="var(--mm-live)" dot>
                            Live now
                          </Badge>
                        )}
                        {isUpcoming && (
                          <Badge color="var(--mm-gold)">Upcoming</Badge>
                        )}
                        {!isLive && !isUpcoming && (
                          <Badge color="var(--mm-text-dim)">Ended</Badge>
                        )}
                        <span className="text-[11px] uppercase tracking-wider text-[var(--mm-text-dim)]">
                          Published on Calendar
                        </span>
                      </div>

                      <h4 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-white">
                        {e.title}
                      </h4>

                      {e.summary && (
                        <p className="text-xs sm:text-sm text-[var(--mm-text-dim)] line-clamp-2">
                          {e.summary}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--mm-text-dim)] pt-1">
                        <span className="flex items-center gap-1.5 text-[var(--mm-gold)] font-medium">
                          <Icon icon="mdi:clock-outline" width={14} />
                          {formatDateTime(e.startsAt)}
                        </span>
                        {e.location && (
                          <span className="flex items-center gap-1.5">
                            <Icon icon="mdi:map-marker-outline" width={14} />
                            {e.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t border-[var(--mm-divider)] sm:border-0">
                      {e.slug && (
                        <Link
                          href={`/events/${e.slug}`}
                          target="_blank"
                          className="mm-btn mm-btn-ghost text-xs"
                        >
                          <Icon icon="mdi:open-in-new" width={14} />
                          <span>View page</span>
                        </Link>
                      )}

                      <form action={deletePartnerEvent}>
                        <input type="hidden" name="partnerId" value={partner.id} />
                        <input type="hidden" name="eventId" value={e.id} />
                        <button
                          type="submit"
                          onClick={(ev) => {
                            if (!confirm("Are you sure you want to remove this event from the calendar?")) {
                              ev.preventDefault();
                            }
                          }}
                          className="mm-btn mm-btn-ghost text-xs text-[var(--mm-danger)] hover:bg-red-950/40"
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

      {/* Add New Event Form */}
      <section id="new-event" className="scroll-mt-24 pt-4">
        <FormCard
          title="Add Event to Calendar"
          subtitle="Publish a gathering or activity hosted by your stall."
          action={createPartnerEvent}
        >
          <input type="hidden" name="partnerId" value={partner.id} />

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
                className="w-full rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-3 py-2.5 text-sm text-[var(--mm-text)] outline-none focus:border-[var(--mm-gold)] transition"
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
                className="w-full rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-3 py-2.5 text-sm text-[var(--mm-text)] outline-none focus:border-[var(--mm-gold)] transition"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="location"
              label="Location / Stall area"
              icon="mdi:map-marker-outline"
              placeholder={`e.g., ${partner.businessName} Stall, Main Hall B`}
              maxLength={160}
            />

            <TextField
              name="externalUrl"
              label="Tickets / Signup link (optional)"
              icon="mdi:link-variant"
              placeholder="https://..."
              type="url"
              maxLength={500}
            />
          </div>

          <TextareaField
            name="bodyMd"
            label="Full event details & instructions (optional)"
            icon="mdi:text"
            rows={4}
            placeholder="What should adventurers bring? Schedule, rules, or prizes..."
            maxLength={4000}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <button
              type="submit"
              className="mm-btn mm-btn-primary w-full justify-center py-3 text-sm font-semibold sm:w-auto sm:px-6"
            >
              <Icon icon="mdi:calendar-check" width={18} />
              <span>Publish to Calendar</span>
            </button>
            <span className="text-xs text-[var(--mm-text-dim)] text-center sm:text-right">
              Events are published immediately and visible to all visitors.
            </span>
          </div>
        </FormCard>
      </section>
    </div>
  );
}
