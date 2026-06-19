import Link from "next/link";
import { ParticleField } from "@/components/particle-field";
import { Icon } from "@/components/icon";
import { getEvents, getPosts, getGalleryImages, isEventLive } from "@/lib/content";
import { formatDate, formatDateTime } from "@/lib/format";

const TAVERN = "/MythicMechaBackground.png";
const BG2 = "/MythicMechaBackground2.png";
const BG3 = "/MythicMechaBackground3.png";
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

const FEATURES = [
  { k: "Quests", d: "Scavenger trails & riddles", icon: "game-icons:treasure-map" },
  { k: "Partners", d: "Makers & merchants", icon: "game-icons:anvil" },
  { k: "Training Yard", d: "Mini-games & leaderboards", icon: "mdi:target" },
  { k: "Events", d: "Gatherings, feasts & tournaments", icon: "game-icons:campfire" },
];

export default async function HomePage() {
  const [posts, events, gallery] = await Promise.all([
    getPosts(),
    getEvents(),
    getGalleryImages(),
  ]);
  const latest = posts.slice(0, 3);
  const nextGathering = events[0];
  const galleryTiles = gallery.slice(0, 8);

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
            Mythical Mecha is the hearth for the geek collective — gathered
            under one roof.
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
          <SectionTitle icon="game-icons:campfire" lead="Upcoming" accent="Events" />

          {nextGathering && (
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
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mm-live)] px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--mm-live)]">
                        <span className="mm-dot-live" /> Live now
                      </span>
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
                href={`/events/${nextGathering.slug}`}
                className="mm-btn mm-btn-primary shrink-0 text-sm"
              >
                Read more <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Latest tidings — forest party ---------------- */}
      <section className="relative isolate overflow-hidden">
        <ImageBackdrop src={BG3} overlay={bandOverlay} />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <ParticleField color="105, 219, 124" />
        </div>
        <div className="mx-auto flex min-h-[480px] max-w-6xl flex-col justify-center px-6 py-20 sm:min-h-[660px]">
          <SectionTitle
            icon="game-icons:scroll-unfurled"
            lead="Latest"
            accent="news & posts"
            right={
              <Link
                href="/news"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
              >
                All news <Icon icon="mdi:arrow-right" width={16} />
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
                <div className="mb-3 flex items-center justify-end">
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

      {/* ---------------- Gallery — plain ---------------- */}
      <section className="bg-[var(--mm-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle icon="mdi:image-multiple-outline" lead="The" accent="Gallery" />
          <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
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

      {/* ---------------- Our community — party on the cliff ---------------- */}
      <section className="relative isolate overflow-hidden">
        <ImageBackdrop src={BG2} overlay={bandOverlay} />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <ParticleField color="108, 184, 255" />
        </div>
        <div className="mx-auto flex min-h-[480px] max-w-6xl flex-col justify-center px-6 py-20 sm:min-h-[660px]">
          <SectionTitle
            icon="mdi:account-group-outline"
            lead="Our"
            accent="community"
            right={
              <Link
                href="/armory"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
              >
                Meet our partners <Icon icon="mdi:arrow-right" width={16} />
              </Link>
            }
          />
          <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
            One hearth for the whole collective — whatever your flavour of geek,
            there&apos;s a table with your name on it.
          </p>
          <a
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
            className="mm-btn mt-5 text-white"
            style={{ background: "#5865F2" }}
          >
            <Icon icon="mdi:discord" width={18} /> Join our Discord
          </a>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {FEATURES.map((g) => (
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
