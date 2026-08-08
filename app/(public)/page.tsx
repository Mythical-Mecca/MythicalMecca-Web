import Link from "next/link";
import { ParticleField } from "@/components/animations/particle-field";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { Icon } from "@/components/icon";
import { auth } from "@/lib/auth";
import {
  getEventsPage,
  getGalleryImages,
  getPartnersByCategory,
  isEventLive,
} from "@/lib/content";
import { EventCalendar } from "@/components/event-calendar";
import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";

/*
 * The public one-pager. Everything a visitor needs to decide whether Mythical
 * Mecca is for them lives here — what we are, what's on, what the hall looks
 * like, and who trades with us. Every other route is members-only, so for a
 * signed-out visitor this page never links into the app; it links to /login.
 *
 * News, guilds, lists, the arcade and LFG are out of the launch scope and
 * deliberately absent from this page (LFG runs in Discord for now).
 */

const TAVERN = "/MythicMechaBackground.webp";
const BG2 = "/MythicMechaBackground2.webp";
const BG3 = "/MythicMechaBackground3.webp";
const DISCORD = "https://discord.gg/NKWMAtq2B";

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

const PILLARS = [
  {
    k: "Events",
    d: "Feasts, tournaments, screenings and meetups — the calendar the whole collective runs on.",
    icon: "game-icons:campfire",
  },
  {
    k: "Quests",
    d: "Scavenger trails, riddles and rune seals at our gatherings. Solve, seek, climb the board.",
    icon: "game-icons:treasure-map",
  },
  {
    k: "Partners",
    d: "Makers, artists and shops from across the collective, setting out their wares.",
    icon: "game-icons:anvil",
  },
];

export default async function HomePage() {
  const [
    session,
    { all: events, live, upcoming: allUpcoming },
    gallery,
    partnerGroups,
  ] = await Promise.all([
    auth(),
    getEventsPage(),
    getGalleryImages(),
    // Grouped under admin-controlled category headings, ordered by category
    // `sort`, and limited to categories flagged "featured on home".
    getPartnersByCategory({ featuredOnly: true }),
  ]);
  const loggedIn = !!session?.user;

  // Signed-out visitors can't reach any app route, so every "read more"
  // affordance collapses to the sign-in page for them.
  const eventHref = (slug: string) => (loggedIn ? `/events/${slug}` : "/login");

  // A live event is the most newsworthy thing on the page, so it leads;
  // otherwise the next thing on the diary does.
  const upcoming = (live ? [live, ...allUpcoming] : allUpcoming).slice(0, 5);
  const nextGathering = upcoming[0];
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
            Mythical Mecca is the hearth for the geek collective — tabletop,
            gaming, anime, cosplay and making, all gathered under one roof.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {loggedIn ? (
              <Link href="/dashboard" className="mm-btn mm-btn-primary">
                <Icon icon="game-icons:castle" width={18} /> Enter the Guild Hall
              </Link>
            ) : (
              <Link href="/login" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:account" width={18} /> Sign in
              </Link>
            )}
            <a href="#events" className="mm-btn mm-btn-ghost">
              <Icon icon="game-icons:campfire" width={18} /> See what&apos;s on
            </a>
          </div>
          {loggedIn && (
            <div className="mt-5 flex justify-center">
              <BackToDashboard />
            </div>
          )}
        </div>
      </section>

      {/* ---------------- What we are ---------------- */}
      <section id="about" className="scroll-mt-20 bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle
            icon="game-icons:castle"
            lead="What is"
            accent="Mythical Mecca"
          />
          <p className="mt-4 max-w-2xl text-lg text-[var(--mm-text-dim)]">
            One hearth for the whole collective. We run gatherings, host quests,
            and give local makers a place to set out their wares. Whatever your
            flavour of geek, there&apos;s a table with your name on it.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <div
                key={p.k}
                className="mm-glass flex flex-col items-start gap-3 p-6 transition hover:border-[var(--mm-violet)]"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--mm-gold) 14%, transparent)",
                    color: "var(--mm-gold)",
                  }}
                >
                  <Icon icon={p.icon} width={26} />
                </span>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-base tracking-wide">
                    {p.k}
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">
                    {p.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Events — the calendar ---------------- */}
      <section
        id="events"
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
          <SectionTitle icon="game-icons:campfire" lead="What's" accent="on" />
          <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
            Feasts, tournaments, screenings and quests — every gathering the
            collective is running.
          </p>

          {nextGathering ? (
            <>
              {/* Next up, spelled out in full */}
              <div className="mm-glass mt-8 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
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
                          width={15}
                          className="text-[var(--mm-gold)]"
                        />
                        {formatDateTime(nextGathering.startsAt)}
                      </span>
                      {nextGathering.location && (
                        <span className="flex items-center gap-1.5">
                          <Icon
                            icon="mdi:map-marker-outline"
                            width={15}
                            className="text-[var(--mm-gold)]"
                          />
                          {nextGathering.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={eventHref(nextGathering.slug)}
                  className="mm-btn mm-btn-primary shrink-0 text-sm"
                >
                  {loggedIn ? "Read more" : "Sign in for details"}{" "}
                  <Icon icon="mdi:arrow-right" width={16} />
                </Link>
              </div>

              {/* The rest of the diary, at a glance */}
              {upcoming.length > 1 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {upcoming.slice(1).map((e) => (
                    <Link
                      key={e.slug}
                      href={eventHref(e.slug)}
                      className="mm-glass group flex items-center gap-4 p-4 transition hover:border-[var(--mm-violet)]"
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

              {/* Full month view — read-only for signed-out visitors */}
              <div className="mt-6">
                <EventCalendar
                  events={calEvents}
                  todayIso={nowIso}
                  linkEvents={loggedIn}
                />
              </div>
            </>
          ) : (
            <div className="mm-glass mt-8 p-8 text-center text-[var(--mm-text-dim)]">
              The calendar is quiet just now — the next gathering will appear
              here as soon as it&apos;s called.
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Gallery ---------------- */}
      {galleryTiles.length > 0 && (
        <section id="gallery" className="scroll-mt-20 bg-[var(--mm-bg)]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionTitle
              icon="mdi:image-multiple-outline"
              lead="The"
              accent="Gallery"
            />
            <p className="mt-3 text-[var(--mm-text-dim)]">
              Moments from the hall — cosplay, minis, fan art and builds.
            </p>
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
          </div>
        </section>
      )}

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
                href="/apply"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
              >
                Apply for a stall <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            }
          />
          <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
            Artisans from across the collective — makers, artists and shops
            setting out their wares.
          </p>

          {!hasPartners ? (
            <div className="mm-glass mt-8 p-8 text-center text-[var(--mm-text-dim)]">
              The first stalls are still being set up. Want one?{" "}
              <Link href="/apply" className="text-[var(--mm-gold)] underline">
                Apply to join
              </Link>
              .
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              {partnerGroups.map((group) => (
                <div key={group.slug}>
                  <div className="flex items-baseline gap-2.5">
                    <Icon
                      icon={group.icon ?? "game-icons:anvil"}
                      width={22}
                      style={{ color: group.color ?? "var(--mm-gold)" }}
                    />
                    <h3 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
                      {group.name}
                    </h3>
                    <span className="text-sm text-[var(--mm-text-dim)]">
                      ({group.partners.length})
                    </span>
                  </div>
                  {group.description && (
                    <p className="mt-1.5 max-w-2xl text-sm text-[var(--mm-text-dim)]">
                      {group.description}
                    </p>
                  )}

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.partners.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/partners/${p.slug}`}
                        className="mm-glass group flex flex-col p-6 transition hover:border-[var(--mm-violet)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          {p.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.logoUrl}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Icon
                              icon={group.icon ?? "game-icons:anvil"}
                              width={28}
                              style={{ color: group.color ?? "var(--mm-gold)" }}
                            />
                          )}
                          {p.isPremium && (
                            <Badge color="var(--mm-gold)" icon="mdi:crown">
                              Premium
                            </Badge>
                          )}
                        </div>
                        <h4 className="mt-4 font-[family-name:var(--font-display)] text-lg group-hover:text-[var(--mm-gold)]">
                          {p.businessName}
                        </h4>
                        <p className="mt-2 flex-1 text-sm text-[var(--mm-text-dim)]">
                          {p.tagline}
                        </p>
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
            Ready to <span className="mm-gradient-text">begin?</span>
          </h2>
          <p className="mt-4 text-[var(--mm-text-dim)]">
            Sign in to join events and take up quests — or come say hello on
            Discord first.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className="mm-btn mm-btn-primary"
            >
              <Icon
                icon={loggedIn ? "game-icons:castle" : "mdi:account"}
                width={18}
              />{" "}
              {loggedIn ? "Enter the Guild Hall" : "Enter the hall"}
            </Link>
            <a
              href={DISCORD}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-btn !rounded-xl text-white"
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
    <div className="flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-2xl tracking-wide md:text-3xl">
        <Icon icon={icon} width={30} className="text-[var(--mm-gold)]" />
        {lead} <span className="mm-gradient-text">{accent}</span>
      </h2>
      {right}
    </div>
  );
}
