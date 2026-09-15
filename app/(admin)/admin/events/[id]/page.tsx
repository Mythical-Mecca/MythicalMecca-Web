import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getEventAdmin } from "@/lib/admin";
import { getPartners } from "@/lib/content";
import {
  updateEvent,
  deleteEvent,
  announceEventOnDiscord,
  addEventGalleryImages,
  removeEventGalleryImage,
  setEventGalleryCaption,
  moveEventGalleryImage,
  setEventCommentDeleted,
  setEventChatDeleted,
  deleteEventReview,
} from "@/app/(admin)/actions-events";
import { FormCard, TextField, TextareaField, inputCls } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { LocationField } from "@/components/location-field";
import { LocalDateTimeField } from "@/components/local-datetime-field";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageUploader } from "@/components/image-uploader";
import { StarRating } from "@/components/star-rating";
import { SectionTabs } from "@/components/section-tabs";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { BackLink } from "@/components/back-link";
import { parseReturn, withReturn, type ReturnTo } from "@/lib/return-to";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEventAdmin(id);
  return { title: `${detail?.title ?? "Event"} · Admin` };
}

const ACCENT = "#5cc08c";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", hint: "No public page. Only visible here.", icon: "mdi:file-outline" },
  { value: "published", label: "Published", hint: "Listed publicly.", icon: "mdi:check-circle-outline" },
  { value: "live", label: "Live", hint: "Happening right now.", icon: "mdi:broadcast" },
  { value: "ended", label: "Ended", hint: "Over — reviews stay open.", icon: "mdi:flag-checkered" },
  { value: "cancelled", label: "Cancelled", hint: "Called off. Pulled from the public site; stays listed here.", icon: "mdi:close-circle-outline" },
  { value: "pending", label: "Pending", hint: "A submission awaiting moderation. Not public.", icon: "mdi:clock-outline" },
  { value: "rejected", label: "Rejected", hint: "A submission turned down. Not public.", icon: "mdi:cancel" },
];

/**
 * The statuses that put an event on the public site. Mirrors
 * PUBLIC_EVENT_STATUSES in lib/content.ts — `status` is the single source of
 * truth for visibility, and the slug follows it rather than competing with it.
 */
const PUBLIC_STATUSES = new Set(["published", "live", "ended"]);

const ORIGIN_OPTIONS = [
  { value: "hosted", label: "Official", hint: "Hosted by us.", icon: "game-icons:castle" },
  { value: "partner", label: "Partner", hint: "Hosted by a partner, endorsed by us.", icon: "game-icons:anvil" },
  { value: "external", label: "External", hint: "Someone else's event — link-out, no RSVP.", icon: "mdi:web" },
  { value: "community", label: "Community", hint: "Member-submitted, moderated.", icon: "mdi:account-group-outline" },
];

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--mm-text-dim)",
  published: "var(--mm-live)",
  live: "var(--mm-gold)",
  ended: "var(--mm-text-dim)",
  cancelled: "var(--mm-danger)",
  pending: "var(--mm-gold)",
  rejected: "var(--mm-danger)",
};

const TABS = [
  { key: "details", label: "Details", icon: "mdi:pencil-outline" },
  { key: "gallery", label: "Gallery", icon: "mdi:image-multiple-outline" },
  { key: "quests", label: "Quests", icon: "game-icons:treasure-map" },
  { key: "community", label: "Community", icon: "mdi:account-group-outline" },
  {
    key: "danger",
    label: "Advanced",
    icon: "mdi:cog-outline",
    tone: "danger" as const,
  },
];

/** Server-rendered in UTC on purpose — see `LocalDateTimeField`. */
function stamp(iso: string | null): string {
  if (!iso) return "—";
  const s = new Date(iso).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)} UTC`;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="mm-glass flex items-center gap-3 p-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${ACCENT}22`, color: ACCENT }}
      >
        <Icon icon={icon} width={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-lg leading-tight tabular-nums">{value}</span>
        {/* Wraps rather than truncates: "Chat m…" is no use to anyone, and
            these labels are the only thing telling the numbers apart. */}
        <span className="block text-xs leading-tight text-[var(--mm-text-dim)]">
          {label}
        </span>
      </span>
    </div>
  );
}

export default async function AdminEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    from?: string;
    fromLabel?: string;
    slug?: string;
    badwindow?: string;
    needslug?: string;
    announced?: string;
  }>;
}) {
  const { id } = await params;
  const [event, partners, sp] = await Promise.all([
    getEventAdmin(id),
    getPartners(),
    searchParams,
  ]);
  if (!event) notFound();

  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "details";
  const base = `/admin/events/${id}`;
  const isPublic = PUBLIC_STATUSES.has(event.status);
  const backTo = parseReturn(sp, {
    href: "/admin/events",
    label: "All events",
  });
  // What this page hands to anything it links out to. The tab is part of
  // it: coming back to Details when you left from Quests is its own small
  // loss of place.
  const returnHere: ReturnTo = {
    href: `${base}?tab=${tab}`,
    label: event.title,
  };

  const liveComments = event.comments.filter((c) => !c.deleted).length;
  const liveChat = event.chat.filter((c) => !c.deleted).length;

  // What each section holds, shown on the rail. Details has no meaningful
  // count — it's always exactly one form — so it gets none rather than a
  // number invented to fill the space.
  const COUNTS: Record<string, number | undefined> = {
    details: undefined,
    gallery: event.gallery.length,
    quests: event.quests.length,
    community: liveComments + liveChat + event.reviews.length,
    danger: undefined,
  };

  return (
    // Capped like the other admin editors: form rows stay a readable length
    // instead of stretching a two-column grid across an ultrawide monitor.
    // Wider than most of them (5xl, not 4xl) because the stat strip is six
    // tiles across and the gallery is a three-column grid.
    <div className="max-w-5xl space-y-6">
      <BackLink to={backTo} />

      <PageHeading
        size="md"
        title={event.title}
        subtitle={`${stamp(event.startsAt)} · ${event.location ?? "no location set"}`}
        icon="game-icons:campfire"
        accent={ACCENT}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={STATUS_COLOR[event.status]}>{event.status}</Badge>
            <Badge>{event.origin}</Badge>
            <Link href={`/events/${event.slug}`} className="mm-btn mm-btn-ghost text-sm">
              <Icon icon="mdi:eye-outline" width={16} /> View public page
            </Link>
          </div>
        }
      />

      {sp.saved && <Flash>Saved.</Flash>}
      {sp.announced && <Flash>Posted to Discord.</Flash>}
      {sp.slug && (
        <Flash tone="error">
          Another event already uses that slug — nothing was saved.
        </Flash>
      )}
      {sp.badwindow && (
        <Flash tone="error">
          The end has to come after the start — nothing was saved.
        </Flash>
      )}
      {sp.needslug && (
        <Flash tone="error">
          A public event needs a slug — that is the URL its page lives at. Add
          one, or set the status back to Draft.
        </Flash>
      )}
      {sp.error && <Flash tone="error">Something went wrong — check the fields and try again.</Flash>}

      <SectionTabs
        label="Event sections"
        items={TABS.map((t) => ({
          href: `${base}?tab=${t.key}`,
          label: t.label,
          icon: t.icon,
          tone: t.tone,
          count: COUNTS[t.key],
        }))}
        active={`${base}?tab=${tab}`}
        accent={ACCENT}
      />

      {/* ------------------------------------------------------------------ */}
      {tab === "details" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat icon="mdi:account-heart-outline" label="Interested" value={event.interested} />
            <Stat icon="mdi:comment-outline" label="Comments" value={liveComments} />
            <Stat icon="mdi:forum-outline" label="Chat" value={liveChat} />
            <Stat
              icon="mdi:star-outline"
              label={`Reviews${event.ratingAvg ? ` · ${event.ratingAvg.toFixed(1)}★` : ""}`}
              value={event.reviews.length}
            />
            <Stat icon="mdi:image-multiple-outline" label="Photos" value={event.gallery.length} />
            <Stat icon="game-icons:treasure-map" label="Quests" value={event.quests.length} />
          </div>

          <FormCard title="Event details" icon="mdi:pencil-outline" accent={ACCENT}>
            <form action={updateEvent} className="space-y-5">
              <input type="hidden" name="id" value={event.id} />

              {/* Visibility, stated rather than inferred.

                  This used to be a Slug field sitting beside Title, marked
                  required and described as "the public URL" — shown identically
                  on a draft that has no public page at all. The thing actually
                  deciding visibility (status) was a picker further down, next
                  to Origin, and nothing on the screen ever said whether this
                  event was public. */}
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: isPublic
                    ? "color-mix(in srgb, var(--mm-live) 45%, transparent)"
                    : "var(--mm-border)",
                  background: isPublic
                    ? "color-mix(in srgb, var(--mm-live) 8%, transparent)"
                    : "color-mix(in srgb, var(--mm-elevated) 40%, transparent)",
                }}
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Icon
                    icon={isPublic ? "mdi:earth" : "mdi:eye-off-outline"}
                    width={17}
                    style={{
                      color: isPublic
                        ? "var(--mm-live)"
                        : "var(--mm-text-dim)",
                    }}
                  />
                  {isPublic ? "Public" : "Not public"}
                </p>
                <p className="mt-1 text-xs text-[var(--mm-text-dim)]">
                  {isPublic ? (
                    event.slug ? (
                      <>
                        Live at{" "}
                        <code className="text-[var(--mm-text)]">
                          /events/{event.slug}
                        </code>
                        . Changing the slug breaks existing links.
                      </>
                    ) : (
                      <>
                        This status is public but there is no slug yet — give it
                        one below and save, or nothing will be reachable.
                      </>
                    )
                  ) : (
                    <>
                      No public page while the status is{" "}
                      <span className="text-[var(--mm-text)]">
                        {event.status}
                      </span>
                      . Members and visitors can&apos;t see it; you still can.
                      {event.slug
                        ? " Its URL is kept reserved for when you publish again."
                        : " Choose a public status to give it a URL."}
                    </>
                  )}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  name="title"
                  label="Title"
                  icon="mdi:format-title"
                  required
                  defaultValue={event.title}
                />
                <TextField
                  name="slug"
                  label="Slug"
                  icon="mdi:link-variant"
                  required={isPublic}
                  defaultValue={event.slug ?? ""}
                  hint={isPublic ? undefined : "optional"}
                  description={
                    isPublic
                      ? "The public URL: /events/<slug>."
                      : "Only needed once this event goes public. Reserved if set."
                  }
                />
              </div>

              <TextField
                name="summary"
                label="Summary"
                hint="optional"
                icon="mdi:text-short"
                defaultValue={event.summary ?? ""}
                description="The one-liner shown in listings."
              />

              <TextareaField
                name="bodyMd"
                label="Details"
                hint="optional"
                icon="mdi:text-long"
                rows={8}
                defaultValue={event.bodyMd ?? ""}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <PickerField
                  name="status"
                  label="Status"
                  icon="mdi:flag-outline"
                  required
                  defaultValue={event.status}
                  options={STATUS_OPTIONS}
                />
                <PickerField
                  name="origin"
                  label="Origin"
                  icon="mdi:source-branch"
                  required
                  defaultValue={event.origin}
                  options={ORIGIN_OPTIONS}
                />
              </div>

              <PickerField
                name="partnerId"
                label="Hosting partner"
                icon="game-icons:anvil"
                hint="origin = partner"
                placeholder="Not hosted by a partner"
                defaultValue={event.partnerId ?? ""}
                description="Shows this event on that partner's public page."
                options={partners.map((p) => ({
                  value: p.id,
                  label: p.businessName,
                  icon: "game-icons:anvil",
                }))}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  name="sourceName"
                  label="Source"
                  hint="origin = external"
                  icon="mdi:web"
                  defaultValue={event.sourceName ?? ""}
                  placeholder="e.g. Cape Town Geek Fest"
                />
                <TextField
                  name="externalUrl"
                  label="External link"
                  hint="also the sign-up link on quests"
                  icon="mdi:open-in-new"
                  type="url"
                  defaultValue={event.externalUrl ?? ""}
                  placeholder="https://…"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <LocalDateTimeField
                  name="startsAt"
                  label="Starts"
                  icon="mdi:calendar-start"
                  valueIso={event.startsAt}
                />
                <LocalDateTimeField
                  name="endsAt"
                  label="Ends"
                  icon="mdi:calendar-end"
                  valueIso={event.endsAt}
                />
              </div>

              {/* Location and its coordinates are one decision, so they're one
                  control. Raw lat/lng stay editable as columns in the events
                  table for the rare case that needs typing. */}
              <LocationField
                defaultValue={event.location ?? ""}
                defaultLat={event.lat}
                defaultLng={event.lng}
              />

              <TextField
                name="capacity"
                label="Capacity"
                hint="optional"
                icon="mdi:account-multiple-outline"
                type="number"
                min={0}
                defaultValue={event.capacity ?? ""}
                className="sm:max-w-xs"
              />

              <PickerField
                label="What this event collects"
                name="noDataMode"
                icon="mdi:shield-lock-outline"
                defaultValue={event.noDataMode ? "1" : "0"}
                options={[
                  {
                    value: "0",
                    label: "The usual",
                    hint: "Members sign in with their account, the site's header is on every page, and quests run off member profiles.",
                    icon: "mdi:account-multiple-outline",
                  },
                  {
                    value: "1",
                    label: "No data allowed",
                    hint: "This event's pages drop the site header entirely, and its quests refuse member accounts — players pick a name and a PIN that exist only inside this event.",
                    icon: "mdi:incognito",
                  },
                ]}
              />

              <button type="submit" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:content-save-outline" width={16} /> Save changes
              </button>
            </form>
          </FormCard>

          {/* Moderation is only meaningful for a submission, so it only
              appears for one — the rest of the time it's noise. */}
          {event.origin === "community" && (
            <FormCard title="Moderation" icon="mdi:gavel" accent={ACCENT}>
              <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                    Submitted by
                  </dt>
                  <dd>{event.submitterName ?? "Unknown adventurer"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                    Reviewed by
                  </dt>
                  <dd>{event.reviewerName ?? "Not yet reviewed"}</dd>
                </div>
              </dl>
              <form action={updateEvent} className="space-y-4">
                <input type="hidden" name="id" value={event.id} />
                <TextareaField
                  name="reviewNote"
                  label="Review note"
                  hint="optional"
                  icon="mdi:comment-text-outline"
                  rows={3}
                  defaultValue={event.reviewNote ?? ""}
                  description="Why it was approved or turned down. Internal."
                />
                <button type="submit" className="mm-btn mm-btn-ghost text-sm">
                  <Icon icon="mdi:content-save-outline" width={16} /> Save note
                </button>
              </form>
            </FormCard>
          )}

          <FormCard title="Announce" icon="mdi:discord" accent={ACCENT}>
            <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
              Posts this event to the Discord server. Safe to run again after a
              reschedule — it posts a fresh message rather than editing the old
              one, so don&apos;t use it as a save button.
            </p>
            <form action={announceEventOnDiscord}>
              <input type="hidden" name="id" value={event.id} />
              <button
                type="submit"
                disabled={!event.startsAt}
                className="mm-btn mm-btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon icon="mdi:send-outline" width={16} />
                {event.startsAt ? "Post to Discord" : "Needs a start time"}
              </button>
            </form>
          </FormCard>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "gallery" && (
        <div className="space-y-6">
          <FormCard title="Add photos" icon="mdi:plus" accent={ACCENT}>
            <form action={addEventGalleryImages} className="space-y-5">
              <input type="hidden" name="id" value={event.id} />
              <ImageUploader
                name="images"
                entityType="event"
                maxFiles={24}
                accent={ACCENT}
                label="Event photos"
                description="Up to 24 · shown on the public event page"
              />
              <button type="submit" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:plus" width={16} /> Add to gallery
              </button>
            </form>
          </FormCard>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
              Photos{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">
                ({event.gallery.length})
              </span>
            </h2>

            {event.gallery.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">
                No photos yet. The public page falls back to the cover treatment.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {event.gallery.map((g, i) => (
                  <li key={g.id} className="mm-glass overflow-hidden">
                    <div className="relative aspect-[4/3] bg-[var(--mm-surface)]">
                      <Image
                        src={g.imageUrl}
                        alt={g.caption ?? "Event photo"}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-2 p-3">
                      <form
                        action={setEventGalleryCaption}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="imageId" value={g.id} />
                        <input
                          name="caption"
                          defaultValue={g.caption ?? ""}
                          aria-label="Image caption"
                          placeholder="Caption"
                          className={`${inputCls} py-1.5 text-xs`}
                        />
                        <button
                          type="submit"
                          className="mm-btn mm-btn-ghost shrink-0 text-xs"
                          title="Save caption"
                        >
                          <Icon icon="mdi:check" width={14} />
                        </button>
                      </form>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <form action={moveEventGalleryImage}>
                            <input type="hidden" name="id" value={event.id} />
                            <input type="hidden" name="imageId" value={g.id} />
                            <input type="hidden" name="dir" value="up" />
                            <button
                              type="submit"
                              disabled={i === 0}
                              title="Move earlier"
                              className="mm-btn mm-btn-ghost text-xs disabled:opacity-35"
                            >
                              <Icon icon="mdi:arrow-left" width={14} />
                            </button>
                          </form>
                          <form action={moveEventGalleryImage}>
                            <input type="hidden" name="id" value={event.id} />
                            <input type="hidden" name="imageId" value={g.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button
                              type="submit"
                              disabled={i === event.gallery.length - 1}
                              title="Move later"
                              className="mm-btn mm-btn-ghost text-xs disabled:opacity-35"
                            >
                              <Icon icon="mdi:arrow-right" width={14} />
                            </button>
                          </form>
                        </div>

                        <form action={removeEventGalleryImage}>
                          <input type="hidden" name="id" value={event.id} />
                          <input type="hidden" name="imageId" value={g.id} />
                          <ConfirmButton
                            label="Remove"
                            confirmLabel="Remove photo"
                            icon="mdi:trash-can-outline"
                            title="Remove this photo?"
                            body="It disappears from the public event page. The uploaded file itself stays in storage."
                            className="mm-btn mm-btn-ghost text-xs"
                          />
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "quests" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--mm-text-dim)]">
            Quests attached to this event. A quest measures venue check-ins from
            the event&apos;s coordinates, so an event with no latitude and
            longitude can&apos;t use open-tag objectives.
          </p>

          {!event.lat || !event.lng ? (
            <Flash tone="error" icon>
              This event has no coordinates set — open-tag objectives will
              silently never complete. Add them on the Details tab.
            </Flash>
          ) : null}

          {event.quests.length === 0 ? (
            <div className="mm-glass p-6 text-center">
              <Icon
                icon="game-icons:treasure-map"
                width={28}
                className="mx-auto mb-2 opacity-40"
              />
              <p className="text-sm text-[var(--mm-text-dim)]">
                No quest attached to this event yet.
              </p>
              <Link
                href={withReturn("/admin/quests", returnHere)}
                className="mm-btn mm-btn-primary mt-4 text-sm"
              >
                <Icon icon="mdi:plus" width={16} /> Create a quest
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {event.quests.map((q) => (
                <li
                  key={q.slug}
                  className="mm-glass flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      icon="game-icons:treasure-map"
                      width={18}
                      style={{ color: ACCENT }}
                    />
                    <span className="truncate">{q.title}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/quests/${q.slug}`} className="mm-btn mm-btn-ghost text-xs">
                      <Icon icon="mdi:eye-outline" width={14} /> View
                    </Link>
                    <Link
                      href={withReturn(`/admin/quests/${q.slug}`, returnHere)}
                      className="mm-btn mm-btn-ghost text-xs"
                    >
                      <Icon icon="mdi:cog-outline" width={14} /> Manage
                    </Link>
                    <Link
                      href={withReturn(`/admin/quests/${q.slug}/tags`, returnHere)}
                      className="mm-btn mm-btn-ghost text-xs"
                    >
                      <Icon icon="mdi:qrcode" width={14} /> Tags
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "community" && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
              <Icon icon="mdi:star-outline" width={20} style={{ color: ACCENT }} />
              Reviews{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">
                ({event.reviews.length}
                {event.ratingAvg ? ` · ${event.ratingAvg.toFixed(1)} average` : ""})
              </span>
            </h2>
            {event.reviews.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">
                No reviews yet. They open once the event has started.
              </p>
            ) : (
              <ul className="space-y-2">
                {event.reviews.map((r) => (
                  <li key={r.id} className="mm-glass p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm">
                        <StarRating value={r.rating} width={14} />
                        <span className="text-[var(--mm-text-dim)]">
                          {r.authorName} · {stamp(r.createdAt)}
                        </span>
                      </span>
                      <form action={deleteEventReview}>
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="reviewId" value={r.id} />
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Delete review"
                          icon="mdi:trash-can-outline"
                          title="Delete this review?"
                          body="Reviews have no deleted flag, so this is permanent — and it frees that person to write a new one."
                          className="mm-btn mm-btn-ghost text-xs"
                        />
                      </form>
                    </div>
                    {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
              <Icon icon="mdi:comment-outline" width={20} style={{ color: ACCENT }} />
              Comments{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">
                ({liveComments} shown, {event.comments.length - liveComments} hidden)
              </span>
            </h2>
            {event.comments.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {event.comments.map((c) => (
                  <li
                    key={c.id}
                    className={`mm-glass p-4 ${c.deleted ? "opacity-55" : ""}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-[var(--mm-text-dim)]">
                        {c.authorName} · {stamp(c.createdAt)}
                        {c.deleted && (
                          <Badge color="var(--mm-danger)" className="ml-2">
                            hidden
                          </Badge>
                        )}
                      </span>
                      <form action={setEventCommentDeleted}>
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="commentId" value={c.id} />
                        <input
                          type="hidden"
                          name="deleted"
                          value={c.deleted ? "0" : "1"}
                        />
                        <button type="submit" className="mm-btn mm-btn-ghost text-xs">
                          <Icon
                            icon={c.deleted ? "mdi:restore" : "mdi:eye-off-outline"}
                            width={14}
                          />
                          {c.deleted ? "Restore" : "Hide"}
                        </button>
                      </form>
                    </div>
                    <p className="mt-2 text-sm">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
              <Icon icon="mdi:forum-outline" width={20} style={{ color: ACCENT }} />
              Event chat{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">
                ({liveChat} shown, {event.chat.length - liveChat} hidden)
              </span>
            </h2>
            {event.chat.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">
                Nothing said yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {event.chat.slice(0, 100).map((m) => (
                  <li
                    key={m.id}
                    className={`mm-glass flex flex-wrap items-center justify-between gap-2 p-3 ${
                      m.deleted ? "opacity-55" : ""
                    }`}
                  >
                    <span className="min-w-0 text-sm">
                      <span className="text-[var(--mm-text-dim)]">
                        {m.authorName} · {stamp(m.createdAt)}
                        {m.deleted && (
                          <Badge color="var(--mm-danger)" className="ml-2">
                            hidden
                          </Badge>
                        )}
                      </span>
                      <span className="mt-1 block">{m.body}</span>
                    </span>
                    <form action={setEventChatDeleted}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="messageId" value={m.id} />
                      <input
                        type="hidden"
                        name="deleted"
                        value={m.deleted ? "0" : "1"}
                      />
                      <button type="submit" className="mm-btn mm-btn-ghost text-xs">
                        <Icon
                          icon={m.deleted ? "mdi:restore" : "mdi:eye-off-outline"}
                          width={14}
                        />
                        {m.deleted ? "Restore" : "Hide"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {event.chat.length > 100 && (
              <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
                Showing the 100 most recent of {event.chat.length}.
              </p>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "danger" && (
        <div className="space-y-6">
          <FormCard title="Record" icon="mdi:information-outline" accent={ACCENT}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  Event ID
                </dt>
                <dd className="font-mono text-xs">{event.id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  Public URL
                </dt>
                <dd className="font-mono text-xs">/events/{event.slug}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  Created
                </dt>
                <dd>{stamp(event.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  Last updated
                </dt>
                <dd>{stamp(event.updatedAt)}</dd>
              </div>
            </dl>
          </FormCard>

          <section className="mm-glass p-6" style={{ borderColor: "var(--mm-danger)" }}>
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-[var(--mm-danger)]">
              <Icon icon="mdi:alert-outline" width={20} />
              Delete this event
            </h2>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              Cancelling is almost always the better move: set the status to{" "}
              <span className="text-[var(--mm-text)]">cancelled</span> and the
              event stays listed, with its history intact, so nobody turns up to
              a locked door.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-[var(--mm-text-dim)]">
              <li>
                · {event.gallery.length} gallery images, {event.comments.length}{" "}
                comments, {event.chat.length} chat messages,{" "}
                {event.reviews.length} reviews and {event.interested} interest
                marks are deleted with it.
              </li>
              <li>
                ·{" "}
                {event.quests.length === 0
                  ? "No quest is attached."
                  : `${event.quests.length} attached quest${
                      event.quests.length > 1 ? "s survive" : " survives"
                    }, but comes loose from this event — venue checks stop working until it's reattached.`}
              </li>
            </ul>
            <form action={deleteEvent} className="mt-5">
              <input type="hidden" name="id" value={event.id} />
              <ConfirmButton
                label="Delete event"
                confirmLabel="Delete permanently"
                icon="mdi:trash-can-outline"
                title={`Delete "${event.title}"?`}
                body="This cannot be undone. Everything listed on the page — gallery, comments, chat, reviews, interest marks — goes with it."
                className="mm-btn mm-btn-ghost text-sm text-[var(--mm-danger)]"
              />
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
