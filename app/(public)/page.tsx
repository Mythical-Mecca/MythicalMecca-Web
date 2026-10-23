import Link from "next/link";
import { ParticleField } from "@/components/animations/particle-field";
import { Icon } from "@/components/icon";
import {
  getEventsPage,
  getGalleryImages,
  getPartnersByCategory,
  isEventLive,
} from "@/lib/content";
import { EventCalendar } from "@/components/event-calendar";
import { listHunts } from "@/lib/hunts";
import { ACCENT } from "@/lib/accents";
import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { withReturn } from "@/lib/return-to";
import { GoogleReviewsCarousel } from "@/components/google-reviews-carousel";

// No title: the root layout's default already names the site, and a template
// suffix on the landing page would read as a duplicate in the tab.
export const metadata = pageMetadata({
  description:
    "The hearth for the geek community. Tabletop, gaming, anime, cosplay and making, under one roof. See what's on and come find your people.",
});

/*
 * The public one-pager. Everything a visitor needs to decide whether Mythical
 * Mecca is for them lives here — what we are, what's on, what the hall looks
 * like, and who trades with us. Sign-in lives on the menu, for stallholders
 * and keepers; this page never pushes an account.
 *
 * News, guilds, lists, the arcade and LFG are out of the launch scope and
 * deliberately absent from this page (LFG runs in Discord for now).
 */

const TAVERN = "/MythicMechaBackground.webp";
const BG2 = "/MythicMechaBackground2.webp";
const BG3 = "/MythicMechaBackground3.webp";
const DISCORD = "https://discord.gg/X5YHrR33T";

const heroOverlay =
  "linear-gradient(to bottom, rgba(11,15,28,0.72) 0%, rgba(11,15,28,0.42) 42%, rgba(11,15,28,0.86) 86%, #0b0f1c 100%)";
const bandOverlay =
  "linear-gradient(to bottom, #0b0f1c 0%, rgba(11,15,28,0.62) 26%, rgba(11,15,28,0.6) 72%, #0b0f1c 100%)";

function ImageBackdrop({ src, overlay }: { src: string; overlay: string }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${src}')` }}
      />
      <div className="absolute inset-0" style={{ background: overlay }} />
    </div>
  );
}

/**
 * The three things we do, as a plain read rather than three cards.
 *
 * `d` is the one-line version somebody scanning the page will take away; `w`
 * is what we actually do about it, for anyone who slowed down. Deliberately
 * not interactive: this is the answer to "what is this", and the sections
 * below are where you go and look.
 */
const PILLARS = [
  {
    k: "Events",
    d: "Feasts, tournaments, screenings and meetups fill one shared calendar.",
    w: "We book the halls and line up the hosts. Some nights are ours and some belong to partners across the community, and we list them all here with a date, a place and a name to ask for.",
    icon: "game-icons:campfire",
  },
  {
    k: "Quests",
    d: "Scavenger trails, riddles and rune seals run at our gatherings.",
    w: "We build trails through the venue and hand you a phone-sized map. You walk to a stand, scan the tag on the counter and take the points. We keep the leaderboard, and you meet a maker you would have walked past.",
    icon: "game-icons:treasure-map",
  },
  {
    k: "Partners",
    d: "Makers, artists and shops from across the community set out their wares.",
    w: "We give each stallholder a page of their own and a place at the gatherings we run. You can read what somebody makes before you meet them at the stand, and find them again a week after everyone has gone home.",
    icon: "game-icons:anvil",
  },
];

export default async function HomePage() {
  const [
    { all: events, live, upcoming: allUpcoming },
    gallery,
    partnerGroups,
    quests,
  ] = await Promise.all([
    getEventsPage(),
    getGalleryImages(),
    // Grouped under category headings (Vendors, Artists, Collaborators)
    getPartnersByCategory(),
    // Only quests whose window is open right now — see openPredicate().
    listHunts(),
  ]);
  const eventHref = (slug: string) =>
    withReturn(`/events/${slug}`, { href: "/", label: "home" });

  // A live event is the most newsworthy thing on the page, so it leads;
  // otherwise the next thing on the diary does.
  const upcoming = (live ? [live, ...allUpcoming] : allUpcoming).slice(0, 5);
  const nextGathering = upcoming[0];
  // The trails running at the event this card is about. The quests section
  // further down lists everything open; this is the one somebody reading
  // about tonight can act on without scrolling past two more bands.
  const nextGatheringQuests = nextGathering
    ? quests.filter((q) => q.eventSlug === nextGathering.slug)
    : [];
  const galleryTiles = gallery.slice(0, 8);
  const hasPartners = partnerGroups.some((g) => g.partners.length > 0);
  const nowIso = new Date().toISOString();
  const calEvents = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    location: e.location,
  }));

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero — tavern ---------------- */}
      <section className="relative isolate overflow-hidden">
        <ImageBackdrop src={TAVERN} overlay={heroOverlay} />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <ParticleField />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-32 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_45%,transparent)] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--mm-text-dim)] backdrop-blur">
            <span className="mm-dot-live" /> The gates are open
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight md:text-7xl">
            Your next <span className="mm-gradient-text">Adventure</span>
          </h1>
          <p className="mt-5 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--mm-text)] md:text-3xl">
            Begin your quest.
          </p>
          <p className="mt-5 max-w-xl text-balance text-lg text-[var(--mm-text-dim)]">
            Mythical Mecca is the hearth for the geek community. Tabletop,
            gaming, anime, cosplay and making, under one roof.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="#events" className="mm-btn mm-btn-primary">
              <Icon icon="game-icons:campfire" width={18} /> See what&apos;s on
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- What we are ---------------- */}
      <section id="about" className="scroll-mt-20 bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <SectionTitle
                icon="game-icons:castle"
                lead="What is"
                accent="Mythical Mecca"
              />
              <p className="mt-4 max-w-xl text-lg text-[var(--mm-text-dim)] leading-relaxed">
                We run the gatherings and the quests, and we give local makers
                somewhere to set out their wares. Bring whatever flavour of geek you
                arrived with.
              </p>
            </div>
            <div className="lg:col-span-5">
              <GoogleReviewsCarousel widgetId="2b5f2498-c955-40f5-8a19-c3923a340476" />
            </div>
          </div>
          {/* Panels, not cards. These describe the place rather than leading
              anywhere, so they carry no surface, no border box and no hover
              state — three of those in a row read as buttons and invite a
              click that goes nowhere. A hairline above each column is enough
              to group it. Body copy matches the paragraph above, because this
              is the same thought continued at more length. */}
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <div
                key={p.k}
                className="border-t border-[var(--mm-divider)] pt-5"
              >
                <Icon
                  icon={p.icon}
                  width={26}
                  className="text-[var(--mm-gold)]"
                />
                <p className="mt-3 font-[family-name:var(--font-display)] text-lg tracking-wide">
                  {p.k}
                </p>
                <p className="mt-2 text-lg text-[var(--mm-text-dim)]">{p.d}</p>
                <p className="mt-3 text-lg text-[var(--mm-text-dim)]">{p.w}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Gallery ----------------

           Always on screen, empty or not. It used to disappear with nothing in
           it, which collapsed the page's photo / flat / photo rhythm and ran
           two full-bleed bands back to back. */}
      <section
        id="gallery"
        className="relative isolate scroll-mt-20 overflow-hidden"
      >
        <ImageBackdrop src={BG3} overlay={bandOverlay} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        >
          <ParticleField color="105, 219, 124" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle
            icon="mdi:image-multiple-outline"
            lead="The"
            accent="Gallery"
          />
          <p className="mt-3 text-[var(--mm-text-dim)]">
            See what people brought to the hall: cosplay, minis, fan art and
            builds.
          </p>
          {galleryTiles.length === 0 ? (
            <div className="mm-glass mt-8 flex flex-col items-center px-6 py-16 text-center sm:py-20">
              <Icon
                icon="mdi:image-multiple-outline"
                width={52}
                className="text-[var(--mm-gold)]"
              />
              <h3 className="mt-5 font-[family-name:var(--font-display)] text-2xl tracking-wide">
                No images yet
              </h3>
              <p className="mx-auto mt-3 max-w-md text-[var(--mm-text-dim)]">
                We photograph the gatherings and put the best of it here. The
                next one will fill this space.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {galleryTiles.map((tile, i) => (
                <div
                  key={i}
                  className="group relative h-44 overflow-hidden rounded-2xl border border-[var(--mm-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tile.imageUrl}
                    alt={tile.caption ?? ""}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {tile.caption && (
                    <div
                      className="absolute inset-x-0 bottom-0 p-3"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(11,15,28,0.9), transparent)",
                      }}
                    >
                      <span className="text-sm font-medium text-[var(--mm-text)]">
                        {tile.caption}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Events — the calendar ---------------- */}
      <section id="events" className="scroll-mt-20 bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle
            icon="game-icons:campfire"
            lead="What's"
            accent="on"
          />
          <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
            We list every gathering the community is running: feasts,
            tournaments, screenings and quests.
          </p>

          {nextGathering ? (
            <>
              {/* Next up, spelled out in full */}
              <div className="mm-glass mt-8 overflow-hidden">
                <div className="flex items-start gap-4 p-6">
                  <Icon
                    icon="game-icons:tower-flag"
                    width={34}
                    className="mt-1 shrink-0 text-[var(--mm-gold)]"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
                        Next gathering
                      </p>
                      {isEventLive(nextGathering) && (
                        <Badge color="var(--mm-live)" dot>
                          Live now
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl">
                      {nextGathering.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm text-[var(--mm-text-dim)]">
                      {nextGathering.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[var(--mm-text-dim)]">
                      <span className="flex items-center gap-1.5">
                        <Icon
                          icon="mdi:clock-outline"
                          width={18}
                          className="shrink-0 text-[var(--mm-gold)]"
                        />
                        {formatDateTime(nextGathering.startsAt)}
                      </span>
                      {nextGathering.location && (
                        <span className="flex items-center gap-1.5">
                          <Icon
                            icon="mdi:map-marker-outline"
                            width={18}
                            className="shrink-0 text-[var(--mm-gold)]"
                          />
                          {nextGathering.location}
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                <Link
                  href={eventHref(nextGathering.slug)}
                  className="flex w-full items-center gap-4 border-t border-[color-mix(in_srgb,var(--mm-gold)_30%,transparent)] py-5 pr-6 pl-[calc(1.5rem+34px+1rem)] text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--mm-gold)_12%,transparent)]"
                >
                  <span className="grid w-[34px] shrink-0 place-items-center">
                    <Icon
                      icon="game-icons:tower-flag"
                      width={22}
                      className="text-[var(--mm-gold)]"
                    />
                  </span>
                  <span className="min-w-0 flex-1">View event page</span>
                  <Icon
                    icon="mdi:arrow-right"
                    width={18}
                    className="shrink-0 text-[var(--mm-text-dim)]"
                  />
                </Link>

                {/* The trails running at this gathering, stacked under the
                    main action rather than tucked into the text column. The
                    label names what the bars are: without it a green bar under
                    a gold one is just a second button. */}
                {nextGatheringQuests.length > 0 && (
                  <div
                    style={{ ["--c"]: ACCENT.quests } as React.CSSProperties}
                    className="border-t border-[color-mix(in_srgb,var(--c)_30%,transparent)]"
                  >
                    <p
                      className="pt-5 pr-6 pl-[calc(1.5rem+34px+1rem)] text-xs uppercase tracking-widest"
                      style={{ color: ACCENT.quests }}
                    >
                      {nextGatheringQuests.length === 1 ? "Quest" : "Quests"}
                    </p>
                    <div className="divide-y divide-[color-mix(in_srgb,var(--c)_22%,transparent)]">
                      {nextGatheringQuests.map((q) => (
                        <Link
                          key={q.slug}
                          href={withReturn(`/quests/${q.slug}`, {
                            href: "/",
                            label: "home",
                          })}
                          className="flex w-full items-center gap-4 py-5 pr-6 pl-[calc(1.5rem+34px+1rem)] text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--c)_12%,transparent)]"
                        >
                          <span className="grid w-[34px] shrink-0 place-items-center">
                            <Icon
                              icon="game-icons:treasure-map"
                              width={22}
                              style={{ color: ACCENT.quests }}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">{q.title}</span>
                            <span className="mt-0.5 block text-xs text-[var(--mm-text-dim)]">
                              {q.steps}{" "}
                              {q.steps === 1 ? "objective" : "objectives"}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* The rest of the diary, at a glance */}
              {upcoming.length > 1 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {upcoming.slice(1).map((e) => (
                    <Link
                      key={e.slug}
                      href={eventHref(e.slug)}
                      className="mm-glass group flex min-w-0 items-center gap-4 overflow-hidden p-4 transition hover:border-[var(--mm-violet)]"
                    >
                      <Icon
                        icon="game-icons:campfire"
                        width={22}
                        className="shrink-0 text-[var(--mm-gold)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-[family-name:var(--font-display)] group-hover:text-[var(--mm-gold)]">
                          {e.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--mm-text-dim)]">
                          {formatDateTime(e.startsAt)}
                          {e.location ? ` · ${e.location}` : ""}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Full month view — event pages are public */}
              <div id="calendar" className="mt-6 scroll-mt-24">
                <EventCalendar
                  events={calEvents}
                  todayIso={nowIso}
                  headingLevel="h3"
                />
              </div>
            </>
          ) : (
            /* The calendar is the reason most people scroll this far, so an
               empty one is the worst thing on the page. Given room and an
               image it reads as a season between gatherings rather than as a
               site with nothing on it, and the Discord link means the scroll
               still ends somewhere. */
            <div className="mm-glass mt-8 flex flex-col items-center px-6 py-16 text-center sm:py-20">
              <Icon
                icon="game-icons:campfire"
                width={52}
                className="text-[var(--mm-gold)]"
              />
              <h3 className="mt-5 font-[family-name:var(--font-display)] text-2xl tracking-wide">
                No new events
              </h3>
              <p className="mx-auto mt-3 max-w-md text-[var(--mm-text-dim)]">
                We have not booked the next one yet. Join the Discord where the
                talk carries on between gatherings.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={DISCORD}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mm-btn text-white text-xs"
                  style={{ background: "#5865F2" }}
                >
                  <Icon icon="mdi:discord" width={16} /> Join our Discord
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Quests ----------------

           Absent rather than empty when nothing is running. A quest only
           exists during an event, so an empty board here would be the normal
      {/* ---------------- Quests ---------------- */}
      <section id="quests" className="scroll-mt-24 bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle
            icon="game-icons:treasure-map"
            lead="Community"
            accent="quests"
          />
          <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
            Trails running at our gatherings. Walk one at the venue and check in as you go to earn event medallions.
          </p>

          {quests.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {quests.map((q) => (
                <Link
                  key={q.slug}
                  href={withReturn(`/quests/${q.slug}`, {
                    href: "/",
                    label: "home",
                  })}
                  style={{ ["--c"]: ACCENT.quests } as React.CSSProperties}
                  className="group flex items-center gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--c)_25%,transparent)] bg-[color-mix(in_srgb,var(--c)_10%,transparent)] p-5 transition-colors hover:border-[color-mix(in_srgb,var(--c)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--c)_18%,transparent)]"
                >
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                    style={{
                      background: "color-mix(in srgb, var(--c) 20%, transparent)",
                      color: "var(--c)",
                    }}
                  >
                    <Icon icon="game-icons:treasure-map" width={26} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-[family-name:var(--font-display)] text-lg tracking-wide">
                      {q.title}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[var(--mm-text-dim)]">
                      {q.steps} {q.steps === 1 ? "objective" : "objectives"}
                      {q.eventTitle ? ` · ${q.eventTitle}` : ""}
                    </span>
                  </span>
                  <Icon
                    icon="mdi:arrow-right"
                    width={20}
                    className="shrink-0 text-[var(--mm-text-dim)] transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mm-glass mt-8 flex flex-col items-center px-6 py-14 text-center">
              <Icon
                icon="game-icons:treasure-map"
                width={48}
                className="text-[var(--mm-gold)]"
              />
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
                No active quests right now
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--mm-text-dim)]">
                Scavenger trails run during our seasonal festival gatherings. Keep an eye on the calendar for the next gathering and check back when the gates open!
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a href="#calendar" className="mm-btn mm-btn-primary text-xs">
                  <Icon icon="mdi:calendar-month-outline" width={16} /> View upcoming gatherings
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Partners ---------------- */}
      <section
        id="partners"
        className="relative isolate scroll-mt-20 overflow-hidden"
      >
        <ImageBackdrop src={BG2} overlay={bandOverlay} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        >
          <ParticleField color="108, 184, 255" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle
            icon="game-icons:anvil"
            lead="Our"
            accent="partners"
            right={
              <Link
                href={withReturn("/apply", { href: "/", label: "home" })}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
              >
                Apply for a stall <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            }
          />
          <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
            Makers, artists and shops from across the community. Each one keeps
            a stall at our gatherings.
          </p>

          {!hasPartners ? (
            <div className="mm-glass mt-8 p-8 text-center text-[var(--mm-text-dim)]">
              We are still setting up the first stalls. Claim one:{" "}
              <Link
                href={withReturn("/apply", { href: "/", label: "home" })}
                className="text-[var(--mm-gold)] underline"
              >
                Apply to join
              </Link>
              .
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              {partnerGroups.map((group) => (
                <div key={group.slug} id={group.slug} className="scroll-mt-24">
                  {/* A dot, not the category icon. Each category carries its
                      own icon and colour from the admin, and a row of
                      different glyphs down the page read as five unrelated
                      sections rather than one list. */}
                  <div className="flex items-baseline gap-2.5">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 self-center rounded-full bg-[var(--mm-blue)]"
                    />
                    <h3 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
                      {group.name}
                    </h3>
                    <span className="text-sm text-[var(--mm-text-dim)]">
                      ({group.partners.length})
                    </span>
                  </div>
                  {/* Faces, not cards. All blocks same size with uniform layout */}
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {group.partners.map((p) => (
                      <Link
                        key={p.slug}
                        href={withReturn(`/partners/${p.slug}`, {
                          href: "/",
                          label: "home",
                        })}
                        className="group flex aspect-square flex-col items-center justify-between rounded-2xl border border-[color-mix(in_srgb,var(--mm-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] p-3.5 text-center transition-all duration-300 hover:scale-105 hover:border-[var(--mm-gold)] hover:bg-[color-mix(in_srgb,var(--mm-surface)_80%,transparent)] hover:shadow-lg"
                      >
                        <div className="flex flex-1 items-center justify-center">
                          <span className="relative">
                            {p.logoUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={p.logoUrl}
                                alt=""
                                className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--mm-border)] sm:h-20 sm:w-20"
                              />
                            ) : (
                              /* No logo yet: the initial, rather than a shared
                                 glyph that would make every such stall look like
                                 the same shop. */
                              <span
                                aria-hidden
                                className="grid h-16 w-16 place-items-center rounded-full bg-[var(--mm-elevated)] font-[family-name:var(--font-display)] text-2xl text-[var(--mm-gold)] ring-1 ring-[var(--mm-border)] sm:h-20 sm:w-20"
                              >
                                {p.businessName.trim().charAt(0).toUpperCase()}
                              </span>
                            )}
                            {p.isPremium && (
                              /* Ringed in the tile's own colour, so the crown
                                 reads as sitting on the card rather than
                                 floating over whatever the backdrop is doing. */
                              <span
                                className="absolute right-0 bottom-0 grid h-6 w-6 place-items-center rounded-full ring-2 ring-[var(--mm-surface)]"
                                style={{
                                  background: "var(--mm-gold)",
                                  color: "var(--mm-bg)",
                                }}
                              >
                                <Icon icon="mdi:crown" width={13} />
                                <span className="sr-only">Premium stall</span>
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex h-10 w-full items-center justify-center">
                          <span className="line-clamp-2 font-[family-name:var(--font-display)] text-xs sm:text-sm font-medium tracking-wide transition-colors group-hover:text-[var(--mm-gold)] leading-snug">
                            {p.businessName}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Final call ---------------- */}
      <section className="bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <Icon
            icon="game-icons:crossed-swords"
            width={48}
            className="mx-auto text-[var(--mm-gold)]"
          />
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl">
            Pull up a <span className="mm-gradient-text">chair</span>
          </h2>
          <p className="mt-4 text-[var(--mm-text-dim)]">
            Say hello on Discord — that&apos;s where the talk carries on
            between gatherings.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={DISCORD}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-btn text-white"
              style={{ background: "#5865F2" }}
            >
              <Icon icon="mdi:discord" width={18} /> Join our Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  icon,
  lead,
  accent,
  right,
}: {
  icon: string;
  lead: string;
  accent: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <h2 className="flex min-w-0 items-center gap-2.5 sm:gap-3 font-[family-name:var(--font-display)] text-2xl tracking-wide md:text-3xl">
        <Icon icon={icon} width={28} className="shrink-0 text-[var(--mm-gold)] sm:w-[30px]" />
        <span>
          {lead} <span className="mm-gradient-text">{accent}</span>
        </span>
      </h2>
      {right}
    </div>
  );
}
