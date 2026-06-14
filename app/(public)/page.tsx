import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--mm-border)] px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--mm-text-dim)]">
        <span className="mm-dot-live" /> Systems online
      </span>

      <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight md:text-7xl">
        Suit up,
        <br />
        <span className="mm-gradient-text">Pilot.</span>
      </h1>

      <p className="mt-6 max-w-xl text-balance text-lg text-[var(--mm-text-dim)]">
        Mythic Mecha is the homebase for the geek collective — tabletop, arcade,
        otaku and maker divisions under one hangar. News, ops, scavenger hunts,
        and the Armory await.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/login" className="mm-btn mm-btn-primary">
          Enter the hangar
        </Link>
        <Link href="/events" className="mm-btn mm-btn-ghost">
          View upcoming ops
        </Link>
      </div>

      <div className="mt-20 grid w-full grid-cols-2 gap-4 md:grid-cols-4">
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
    </section>
  );
}
