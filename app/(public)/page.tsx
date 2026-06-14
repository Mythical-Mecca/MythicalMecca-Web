import Link from "next/link";
import { ParticleField } from "@/components/particle-field";
import { getEvents, getPosts } from "@/lib/content";
import { DivisionBadge } from "@/components/content-ui";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const [posts, events] = await Promise.all([getPosts(), getEvents()]);
  const latest = posts.slice(0, 3);
  const nextOp = events[0];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <ParticleField />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-28 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--mm-border)] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--mm-text-dim)]">
            <span className="mm-dot-live" /> Systems online
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight md:text-7xl">
            Suit up,
            <br />
            <span className="mm-gradient-text">Pilot.</span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-[var(--mm-text-dim)]">
            Mythic Mecha is the homebase for the geek collective — tabletop,
            arcade, otaku and maker divisions under one hangar.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="mm-btn mm-btn-primary">
              Enter the hangar
            </Link>
            <Link href="/events" className="mm-btn mm-btn-ghost">
              View upcoming ops
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { k: "Tabletop", d: "TTRPG & minis" },
            { k: "Arcade", d: "Gaming & esports" },
            { k: "Otaku", d: "Anime & comics" },
            { k: "Maker", d: "Tech & builds" },
          ].map((x) => (
            <div key={x.k} className="mm-glass p-5 text-left">
              <p className="font-[family-name:var(--font-display)] text-sm tracking-widest">
                {x.k}
              </p>
              <p className="mt-1 text-xs text-[var(--mm-text-dim)]">{x.d}</p>
            </div>
          ))}
        </div>

        {nextOp && (
          <div className="mm-glass mt-12 flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
                Next op
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl">
                {nextOp.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                {formatDate(nextOp.startsAt)} · {nextOp.location}
              </p>
            </div>
            <Link
              href={`/events/${nextOp.slug}`}
              className="mm-btn mm-btn-primary text-sm"
            >
              Op details
            </Link>
          </div>
        )}

        <div className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              Latest <span className="mm-gradient-text">transmissions</span>
            </h2>
            <Link
              href="/news"
              className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
            >
              All news →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
