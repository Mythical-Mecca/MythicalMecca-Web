import Link from "next/link";
import { ParticleField } from "@/components/particle-field";
import { Icon } from "@/components/icon";
import { getEvents, getPosts, getVendors } from "@/lib/content";
import { DivisionBadge } from "@/components/content-ui";
import { formatDate, formatDateTime } from "@/lib/format";

const TAVERN = "/MythicMechaBackground.png";
const QUEST = "/quest-road.svg";

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

const GUILDS = [
  { k: "Tabletop", d: "TTRPG & minis", icon: "game-icons:rolling-dices" },
  { k: "Arcade", d: "Gaming & esports", icon: "game-icons:joystick" },
  { k: "Otaku", d: "Anime & comics", icon: "game-icons:katana" },
  { k: "Maker", d: "Tech & crafts", icon: "game-icons:anvil" },
];

export default async function HomePage() {
  const [posts, events, vendors] = await Promise.all([
    getPosts(),
    getEvents(),
    getVendors(),
  ]);
  const latest = posts.slice(0, 3);
  const upcoming = events.slice(0, 3);
  const nextGathering = events[0];
  const featured = vendors.slice(0, 3);

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
            Mythic Mecha is the hearth for the geek collective — tabletop,
            arcade, otaku and maker guilds gathered under one roof.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="mm-btn mm-btn-primary">
              <Icon icon="mdi:login-variant" width={18} /> Sign in
            </Link>
            <Link href="/events" className="mm-btn mm-btn-ghost">
              <Icon icon="game-icons:campfire" width={18} /> View events
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Upcoming gatherings — plain ---------------- */}
      <section className="bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle icon="game-icons:campfire" lead="Upcoming" accent="gatherings" />

          {nextGathering && (
            <div className="mm-glass mt-8 flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <Icon
                  icon="game-icons:tower-flag"
                  width={34}
                  className="mt-1 text-[var(--mm-gold)]"
                />
                <div>
                  <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
                    Next gathering
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl">
                    {nextGathering.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-[var(--mm-text-dim)]">
                    <Icon icon="mdi:map-marker-outline" width={15} />
                    {formatDate(nextGathering.startsAt)} · {nextGathering.location}
                  </p>
                </div>
              </div>
              <Link
                href={`/events/${nextGathering.slug}`}
                className="mm-btn mm-btn-primary text-sm"
              >
                Read more <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {upcoming.map((e) => (
              <Link
                key={e.slug}
                href={`/events/${e.slug}`}
                className="mm-glass group p-5 transition hover:border-[var(--mm-violet)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <DivisionBadge division={e.division} />
                  <Icon
                    icon="game-icons:campfire"
                    width={18}
                    className="text-[var(--mm-text-dim)] group-hover:text-[var(--mm-gold)]"
                  />
                </div>
                <h3 className="font-medium group-hover:text-[var(--mm-gold)]">
                  {e.title}
                </h3>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                  <Icon icon="mdi:clock-outline" width={14} />
                  {formatDateTime(e.startsAt)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Latest tidings — quest scene ---------------- */}
      <section className="relative isolate overflow-hidden">
        <ImageBackdrop src={QUEST} overlay={bandOverlay} />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionTitle
            icon="game-icons:scroll-unfurled"
            lead="Latest"
            accent="tidings"
            right={
              <Link
                href="/news"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
              >
                All tidings <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            }
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latest.map((p) => (
              <Link
                key={p.slug}
                href={`/news/${p.slug}`}
                className="mm-glass group p-5 transition hover:border-[var(--mm-violet)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <DivisionBadge division={p.division} />
                  <span className="text-xs text-[var(--mm-text-dim)]">
                    {formatDate(p.publishedAt)}
                  </span>
                </div>
                <h3 className="font-medium group-hover:text-[var(--mm-gold)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
                  {p.excerpt}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--mm-gold)]">
                  Read <Icon icon="mdi:arrow-right" width={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Choose your guild — plain ---------------- */}
      <section className="bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle icon="game-icons:round-shield" lead="Choose your" accent="guild" />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {GUILDS.map((g) => (
              <div
                key={g.k}
                className="mm-glass flex flex-col items-start gap-3 p-6 transition hover:border-[var(--mm-violet)]"
              >
                <Icon icon={g.icon} width={34} className="text-[var(--mm-gold)]" />
                <div>
                  <p className="font-[family-name:var(--font-display)] text-sm tracking-widest">
                    {g.k}
                  </p>
                  <p className="mt-1 text-xs text-[var(--mm-text-dim)]">{g.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- The Armory — tavern ---------------- */}
      <section className="relative isolate overflow-hidden">
        <ImageBackdrop src={TAVERN} overlay={bandOverlay} />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionTitle
            icon="game-icons:anvil"
            lead="The"
            accent="Armory"
            right={
              <Link
                href="/armory"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
              >
                Browse all <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            }
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => (
              <Link
                key={v.slug}
                href={`/armory/${v.slug}`}
                className="mm-glass group p-5 transition hover:border-[var(--mm-violet)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <DivisionBadge division={v.division} />
                  <Icon
                    icon="game-icons:shop"
                    width={20}
                    className="text-[var(--mm-text-dim)] group-hover:text-[var(--mm-gold)]"
                  />
                </div>
                <h3 className="font-medium group-hover:text-[var(--mm-gold)]">
                  {v.businessName}
                </h3>
                <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                  {v.tagline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Final call — plain ---------------- */}
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
            Join the guild, take up quests, and earn your renown.
          </p>
          <Link
            href="/login"
            className="mm-btn mm-btn-primary mx-auto mt-8 w-fit"
          >
            <Icon icon="mdi:login-variant" width={18} /> Enter the hall
          </Link>
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
