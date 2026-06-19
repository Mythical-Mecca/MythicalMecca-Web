import Link from "next/link";
import { ParticleField } from "@/components/particle-field";
import { Icon } from "@/components/icon";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const metadata = { title: "News — Mythical Mecha" };

const HERO_BG = "/MythicMechaBackground3.png";
const heroOverlay =
  "linear-gradient(to bottom, rgba(11,15,28,0.74) 0%, rgba(11,15,28,0.5) 45%, #0b0f1c 100%)";

export default async function NewsPage() {
  const posts = await getPosts();
  const [featured, ...rest] = posts;

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
          <ParticleField color="105, 219, 124" />
        </div>
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_45%,transparent)] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--mm-text-dim)] backdrop-blur">
            <Icon
              icon="game-icons:scroll-unfurled"
              width={15}
              className="text-[var(--mm-gold)]"
            />
            Dispatches from the hall
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide md:text-6xl">
            Latest <span className="mm-gradient-text">news</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[var(--mm-text-dim)]">
            Transmissions, tidings and dispatches from across the collective.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
        {/* ---------------- Featured / latest ---------------- */}
        {featured && (
          <Link
            href={`/news/${featured.slug}`}
            className="mm-glass group block p-7 transition hover:border-[var(--mm-violet)] md:p-9"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-widest text-[var(--mm-gold)]">
              <span className="inline-flex items-center gap-1.5">
                <Icon icon="mdi:star-four-points-outline" width={14} /> Latest
              </span>
              <span className="tracking-normal text-[var(--mm-text-dim)] [text-transform:none]">
                {formatDate(featured.publishedAt)}
              </span>
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl group-hover:text-[var(--mm-gold)] md:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--mm-text-dim)]">
              {featured.excerpt}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--mm-gold)]">
              Read the dispatch
              <Icon
                icon="mdi:arrow-right"
                width={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        )}

        {/* ---------------- The rest ---------------- */}
        {rest.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Link
                key={p.slug}
                href={`/news/${p.slug}`}
                className="mm-glass group flex flex-col p-6 transition hover:border-[var(--mm-violet)]"
              >
                <div className="flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                  <Icon icon="mdi:calendar-blank-outline" width={14} />
                  {formatDate(p.publishedAt)}
                </div>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg group-hover:text-[var(--mm-gold)]">
                  {p.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-[var(--mm-text-dim)]">
                  {p.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-[var(--mm-gold)]">
                  Read
                  <Icon
                    icon="mdi:arrow-right"
                    width={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 && (
          <p className="mm-glass mt-8 p-8 text-center text-[var(--mm-text-dim)]">
            No dispatches yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
