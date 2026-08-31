import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEvent,
  type EventView,
  isEventLive,
  isEventEnded,
  getEventGallery,
  hasMarkedInterested,
} from "@/lib/content";
import {
  getComments,
  getReviews,
  getReviewSummary,
  eventIdBySlug,
} from "@/lib/events-social";
import { listHuntsForEvent } from "@/lib/hunts";
import { PickerField } from "@/components/picker-field";
import { listChatMessages } from "@/lib/chat";
import { EventChat } from "@/components/event-chat";
import { roleAtLeast } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { Icon } from "@/components/icon";
import { SimpleProse } from "@/components/content-ui";
import { EventActions } from "@/components/event-actions";
import { EventOriginBadge } from "@/components/event-origin-badge";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/card";
import { inputPill } from "@/components/form";
import { formatDateTime, formatDate } from "@/lib/format";
import { SignInCta } from "@/components/sign-in-cta";
import { pageMetadata } from "@/lib/metadata";
import {
  addComment,
  addReview,
  markInterested,
  unmarkInterested,
} from "@/app/(app)/events/actions";
import { parseReturn, withReturn } from "@/lib/return-to";
import { BackLink } from "@/components/back-link";

/**
 * The record's own name in the tab, the history entry and any bookmark. These
 * detail routes all inherited the site-wide default, so every event, partner
 * and quest page was indistinguishable from every other.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) {
    return pageMetadata({
      title: "Event",
      description: "This event has ended or the link is no longer good.",
    });
  }

  // When and where come first: for a link dropped into a group chat, those are
  // the two things everyone replies asking about.
  const when = formatDateTime(event.startsAt);
  const where = event.location ? ` · ${event.location}` : "";
  const summary = event.summary?.trim();

  return pageMetadata({
    title: event.title,
    description: summary ? `${when}${where}. ${summary}` : `${when}${where}.`,
  });
}

/** The signed-out view: the facts of the event, and the way in. */
function EventTeaser({ event }: { event: EventView }) {
  const live = isEventLive(event);
  const ended = isEventEnded(event);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--mm-gold)]">
          {live ? "Happening now" : ended ? "This event has ended" : "Upcoming"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-wide sm:text-4xl">
          {event.title}
        </h1>
        {event.summary && (
          <p className="mx-auto mt-3 max-w-lg text-[var(--mm-text-dim)]">
            {event.summary}
          </p>
        )}
      </header>

      <section className="mm-glass mm-panel mt-6 space-y-2.5 p-5 text-sm">
        <p className="flex items-start gap-2.5">
          <Icon
            icon="mdi:calendar-clock"
            width={17}
            className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
          />
          <span>{formatDateTime(event.startsAt)}</span>
        </p>
        {event.location && (
          <p className="flex items-start gap-2.5">
            <Icon
              icon="mdi:map-marker-outline"
              width={17}
              className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
            />
            <span>{event.location}</span>
          </p>
        )}
        {event.partnerName && (
          <p className="flex items-start gap-2.5">
            <Icon
              icon="game-icons:shop"
              width={17}
              className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
            />
            <span>Hosted by {event.partnerName}</span>
          </p>
        )}
      </section>

      {/* A no-data event has nothing to sign into. Offering an account here
          would contradict the one promise the flag makes, so the teaser ends
          at the facts — and the quest page carries its own way in. */}
      {!event.noDataMode && (
        <SignInCta
          from={`/events/${event.slug}`}
          headline={ended ? "See how it went" : "Pull up a chair"}
          blurb={
            ended
              ? "Sign in to read the full write-up, the gallery and what people made of it."
              : "Sign in for the full details, to say you're coming and to talk to whoever else is."
          }
        />
      )}
    </div>
  );
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    cerror?: string;
    rerror?: string;
    from?: string;
    fromLabel?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { cerror, rerror } = sp;
  // Reachable from the dashboard, the events board, a partner's page, a quest
  // and the calendar. The events board is only the right answer for one.
  const backTo = parseReturn(sp, { href: "/events", label: "Events" });
  const event = await getEvent(slug);
  if (!event) notFound();

  const session = await auth();

  /**
   * Signed out, this is the listing — not the room.
   *
   * Comments, reviews and chat are members talking to each other under their
   * real names; the gallery is theirs too. The facts of the event are public
   * by nature, so those are what a forwarded link shows.
   */
  if (!session?.user) {
    return <EventTeaser event={event} />;
  }

  const [comments, reviews, summary, gallery, interested] = await Promise.all([
    getComments(slug),
    getReviews(slug),
    getReviewSummary(slug),
    getEventGallery(slug),
    event.origin === "external" && session?.user
      ? hasMarkedInterested(slug, session.user.id)
      : Promise.resolve(false),
  ]);
  const live = isEventLive(event);
  const ended = isEventEnded(event);
  const isExternal = event.origin === "external";
  const eventId = await eventIdBySlug(slug);
  const [chatHistory, quests] = await Promise.all([
    eventId && session?.user
      ? listChatMessages("event", eventId)
      : Promise.resolve([]),
    eventId ? listHuntsForEvent(eventId) : Promise.resolve([]),
  ]);

  const returnTo = `/events/${event.slug}`;

  return (
    <div className="flex flex-col pb-24 lg:grid lg:grid-cols-[minmax(0,48rem)_18rem] lg:items-start lg:gap-8">
      <article className="min-w-0 max-w-3xl lg:order-none">
      <div className="mb-2 -ml-1">
        <BackLink to={backTo} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <EventOriginBadge origin={event.origin} />
        {live && (
          <Badge color="var(--mm-live)" dot>
            Live now
          </Badge>
        )}
        {ended && <Badge>Ended</Badge>}
        <span className="text-xs text-[var(--mm-text-dim)]">
          {formatDateTime(event.startsAt)}
        </span>
        {event.origin === "partner" && event.partnerSlug && (
          <Link
            href={withReturn(`/partners/${event.partnerSlug}`, {
              href: returnTo,
              label: event.title,
            })}
            className="inline-flex items-center gap-1 text-xs text-[var(--mm-gold)] hover:underline"
          >
            <Icon icon="game-icons:anvil" width={13} />
            Hosted by {event.partnerName}
          </Link>
        )}
      </div>

      <PageHeading title={event.title} subtitle={event.summary} />

      {/* ---------------- Event info card (first section) ---------------- */}
      <Card
        title="Event details"
        icon="mdi:calendar-clock"
        accent="#5cc08c"
        className="mt-8"
      >
        {/* Refined detail rows */}
        <dl className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,#5cc08c_16%,transparent)] text-[#5cc08c]">
              <Icon icon="mdi:clock-outline" width={16} />
            </span>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                When
              </dt>
              <dd className="mt-0.5 text-sm">
                {formatDateTime(event.startsAt)}{" "}
                <span className="text-[var(--mm-text-dim)]">→</span>{" "}
                {formatDateTime(event.endsAt)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,#5cc08c_16%,transparent)] text-[#5cc08c]">
              <Icon icon="mdi:map-marker-outline" width={16} />
            </span>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                Where
              </dt>
              <dd className="mt-0.5 text-sm">{event.location ?? "TBA"}</dd>
            </div>
          </div>
          {isExternal && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,#5cc08c_16%,transparent)] text-[#5cc08c]">
                <Icon icon="mdi:account-multiple-outline" width={16} />
              </span>
              <div className="min-w-0">
                <dt className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  Organiser
                </dt>
                <dd className="mt-0.5 text-sm">
                  {event.sourceName ?? "An outside organiser"}
                  <span className="text-[var(--mm-text-dim)]">
                    {" "}
                    · {event.interestedCount} interested
                  </span>
                </dd>
              </div>
            </div>
          )}
        </dl>

        {event.bodyMd && (
          <div className="mt-5 text-sm">
            <SimpleProse text={event.bodyMd} />
          </div>
        )}

        {/* Actions — pinned to the bottom of the card */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--mm-border)] pt-5">
          {isExternal ? (
            <>
              <form action={interested ? unmarkInterested : markInterested}>
                <input type="hidden" name="slug" value={event.slug} />
                <button
                  className={`mm-btn text-sm ${
                    interested ? "mm-btn-primary" : "mm-btn-ghost"
                  }`}
                >
                  <Icon
                    icon={interested ? "mdi:star" : "mdi:star-outline"}
                    width={16}
                  />
                  {interested ? "Interested" : "I'm interested"}
                </button>
              </form>
              {event.externalUrl && (
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mm-btn mm-btn-primary text-sm"
                >
                  <Icon icon="mdi:open-in-new" width={16} /> Event page
                </a>
              )}
            </>
          ) : (
            <EventActions
              slug={event.slug}
              title={event.title}
              startsAt={event.startsAt}
              endsAt={event.endsAt}
              summary={event.summary}
              location={event.location}
              showCalendar={!live}
            />
          )}
        </div>
      </Card>

      {gallery.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl tracking-wide">
            Gallery
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((g, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-xl border border-[var(--mm-border)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.imageUrl}
                  alt={g.caption ?? ""}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Event chat — before & during only ---------------- */}
      {!ended && session?.user && eventId && (
        <section id="chat" className="mt-14">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl tracking-wide">
            Event chat
          </h2>
          <EventChat
            scopeType="event"
            scopeId={eventId}
            initialMessages={chatHistory}
            currentUserId={session.user.id}
            isAdmin={roleAtLeast(session.user.role, "admin")}
            live={live}
          />
        </section>
      )}

      {/* ---------------- Comments & reviews — after the event ---------------- */}
      {ended && (
        <>
          <section id="comments" className="mt-14">
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
              Comments ({comments.length})
            </h2>
            {cerror && (
              <p className="mt-2 text-sm text-[var(--mm-danger)]">
                Could not post comment.
              </p>
            )}
            <form action={addComment} className="mt-4 flex gap-2">
              <input type="hidden" name="slug" value={event.slug} />
              <input
                name="body"
                aria-label="Add a comment"
                placeholder="Share a word…"
                className={`flex-1 ${inputPill}`}
              />
              <button className="mm-btn mm-btn-primary text-sm">Send</button>
            </form>
            <ul className="mt-6 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="mm-glass p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--mm-text-dim)]">
                    <span className="text-[var(--mm-gold)]">{c.author}</span>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm">{c.body}</p>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-[var(--mm-text-dim)]">
                  No comments yet — be the first.
                </li>
              )}
            </ul>
          </section>

          <section id="reviews" className="mt-14">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
                Reviews ({summary.count})
              </h2>
              {summary.count > 0 && (
                <span className="text-sm text-[var(--mm-gold)]">
                  ★ {summary.avg} / 5
                </span>
              )}
            </div>

            {rerror === "locked" && (
              <p className="mt-2 text-sm text-[var(--mm-danger)]">
                Reviews unlock once the event begins.
              </p>
            )}

            <form action={addReview} className="mt-4 space-y-3">
              <input type="hidden" name="slug" value={event.slug} />
              <PickerField
                name="rating"
                label="Rating"
                icon="mdi:star"
                defaultValue="5"
                options={[
                  { value: "5", label: "★★★★★", hint: "Excellent" },
                  { value: "4", label: "★★★★", hint: "Great" },
                  { value: "3", label: "★★★", hint: "Good" },
                  { value: "2", label: "★★", hint: "Fair" },
                  { value: "1", label: "★", hint: "Poor" },
                ]}
              />
              <textarea
                name="body"
                aria-label="Your review of this gathering"
                rows={3}
                placeholder="How was the gathering?"
                className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm focus:border-[var(--mm-violet)]"
              />
              <button className="mm-btn mm-btn-primary text-sm">
                Post review
              </button>
            </form>

            <ul className="mt-6 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="mm-glass p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--mm-gold)]">{r.author}</span>
                    <span className="text-[var(--mm-gold)]">
                      {"★".repeat(r.rating)}
                    </span>
                  </div>
                  {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      </article>

      {/* ---------------- Quests — right rail on desktop ---------------- */}
      {quests.length > 0 && (
        // On a phone this used to sit below the body copy, the gallery and the
        // chat — around 1500px down, so the quest looked like it wasn't
        // attached at all. At an event it's the most actionable thing here, so
        // on small screens it leads. The desktop right rail is unchanged.
        <aside className="order-first mb-6 lg:order-none lg:mt-0 lg:mb-0 lg:sticky lg:top-24">
          <Card
            title="Quests"
            icon="game-icons:treasure-map"
            accent="#9a6cff"
            bodyClassName="p-3"
          >
            <div className="space-y-1.5">
              {quests.map((q) => (
                <Link
                  key={q.slug}
                  href={withReturn(`/quests/${q.slug}`, {
                    href: returnTo,
                    label: event.title,
                  })}
                  className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-[color-mix(in_srgb,var(--mm-surface)_70%,transparent)]"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{
                      background: "color-mix(in srgb, #9a6cff 18%, transparent)",
                      color: "#9a6cff",
                    }}
                  >
                    <Icon icon="game-icons:treasure-map" width={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-[family-name:var(--font-display)] group-hover:text-[var(--mm-gold)]">
                      {q.title}
                    </span>
                    {q.description && (
                      <span className="mt-0.5 line-clamp-1 block text-[11px] text-[var(--mm-text-dim)]">
                        {q.description}
                      </span>
                    )}
                  </span>
                  <Icon
                    icon="mdi:arrow-right"
                    width={15}
                    className="shrink-0 text-[var(--mm-text-dim)]"
                  />
                </Link>
              ))}
            </div>
          </Card>
        </aside>
      )}
    </div>
  );
}
