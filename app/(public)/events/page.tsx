import Link from "next/link";
import { ParticleField } from "@/components/particle-field";
import { Icon } from "@/components/icon";
import { EventCalendar } from "@/components/event-calendar";
import { getEvents, isEventLive, type EventView } from "@/lib/content";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Events — Mythical Mecca" };

const HERO_BG = "/MythicMechaBackground.png";
const heroOverlay =
  "linear-gradient(to bottom, rgba(11,15,28,0.74) 0%, rgba(11,15,28,0.5) 45%, #0b0f1c 100%)";

/** Pick a thematic icon from the event's title/summary. */
function eventIcon(e: EventView): string {
  const t = `${e.title} ${e.summary}`.toLowerCase();
  if (/anime|marathon|screening|mecha|otaku/.test(t)) return "mdi:movie-open-outline";
  if (/tournament|tourney|tactics|battle|duel/.test(t)) return "game-icons:crossed-swords";
  if (/tabletop|board|dice|ttrpg|campaign|minis?/.test(t)) return "game-icons:rolling-dices";
  if (/quest|scavenger|riddle|trail/.test(t)) return "game-icons:treasure-map";
  return "game-icons:campfire";
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mm-live)] px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--mm-live)]">
      <span className="mm-dot-live" /> Live now
    </span>
  );
}

export default async function EventsPage() {
  const events = await getEvents();
  const [featured, ...rest] = events;
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
      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO_BG}')` }}
          />
          <div className="absolute inset-0" style={{ background: heroOverlay }} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        >
          <ParticleField color="225, 141, 1" />
        </div>
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_45%,transparent)] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--mm-text-dim)] backdrop-blur">
            <Icon icon="game-icons:campfire" width={15} className="text-[var(--mm-gold)]" />
            The hall&apos;s calendar
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide md:text-6xl">
            Upcoming <span className="mm-gradient-text">events</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[var(--mm-text-dim)]">
            Feasts, tournaments, screenings and quests — every gathering across
            the guilds. Pull up a chair.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
        {/* ---------------- Mystical calendar ---------------- */}
        <EventCalendar events={calEvents} todayIso={nowIso} />

        {/* ---------------- Upcoming list ---------------- */}
        <div className="mt-14 flex items-center gap-3">
          <Icon
            icon="game-icons:campfire"
            width={26}
            className="text-[var(--mm-gold)]"
          />
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide md:text-3xl">
            Upcoming <span className="mm-gradient-text">gatherings</span>
          </h2>
        </div>

        {/* ---------------- Featured / next ---------------- */}
        <div className="mt-6" />
        {featured && (
          <Link
            href={`/events/${featured.slug}`}
            className="mm-glass group block p-7 transition hover:border-[var(--mm-violet)] md:p-9"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-5">
                <span className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)]">
                  <Icon
                    icon={eventIcon(featured)}
                    width={30}
                    className="text-[var(--mm-gold)]"
                  />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
                      Next gathering
                    </span>
                    {isEventLive(featured) && <LiveBadge />}
                  </div>
                  <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl group-hover:text-[var(--mm-gold)] md:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-[var(--mm-text-dim)]">
                    {featured.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--mm-text-dim)]">
                    <span className="flex items-center gap-1.5">
                      <Icon
                        icon="mdi:clock-outline"
                        width={16}
                        className="text-[var(--mm-gold)]"
                      />
                      {formatDateTime(featured.startsAt)}
                    </span>
                    {featured.location && (
                      <span className="flex items-center gap-1.5">
                        <Icon
                          icon="mdi:map-marker-outline"
                          width={16}
                          className="text-[var(--mm-gold)]"
                        />
                        {featured.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="mm-btn mm-btn-primary shrink-0 text-sm">
                Details <Icon icon="mdi:arrow-right" width={16} />
              </span>
            </div>
          </Link>
        )}

        {/* ---------------- The rest ---------------- */}
        {rest.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {rest.map((e) => (
              <Link
                key={e.slug}
                href={`/events/${e.slug}`}
                className="mm-glass group flex flex-col p-6 transition hover:border-[var(--mm-violet)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)]">
                    <Icon
                      icon={eventIcon(e)}
                      width={22}
                      className="text-[var(--mm-gold)] group-hover:text-[var(--mm-gold-hi)]"
                    />
                  </span>
                  {isEventLive(e) ? (
                    <LiveBadge />
                  ) : (
                    <span className="text-xs text-[var(--mm-text-dim)]">
                      {formatDateTime(e.startsAt)}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl group-hover:text-[var(--mm-gold)]">
                  {e.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-[var(--mm-text-dim)]">
                  {e.summary}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--mm-border)] pt-3">
                  {e.location ? (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                      <Icon icon="mdi:map-marker-outline" width={14} />
                      {e.location}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--mm-gold)]">
                    Details <Icon icon="mdi:arrow-right" width={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {events.length === 0 && (
          <p className="mm-glass mt-8 p-8 text-center text-[var(--mm-text-dim)]">
            No gatherings on the calendar yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
