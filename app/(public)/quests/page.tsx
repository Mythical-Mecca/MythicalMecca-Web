import Link from "next/link";
import { listHunts } from "@/lib/hunts";
import { Icon } from "@/components/icon";
import { SectionHero } from "@/components/section-hero";
import { ACCENT } from "@/lib/accents";
import { pageMetadata } from "@/lib/metadata";
import { withReturn } from "@/lib/return-to";

export const metadata = pageMetadata({
  title: "Quests",
  description:
    "Community scavenger trails running at Mythical Mecca gatherings. Scan station checkpoints, unlock clues and earn unique event medallions.",
});

export default async function QuestsPage() {
  const quests = await listHunts();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-8 py-8 sm:py-12">
      <SectionHero section="quests" />

      <div className="mt-8 sm:mt-12">
        {quests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quests.map((q) => (
              <Link
                key={q.slug}
                href={withReturn(`/quests/${q.slug}`, {
                  href: "/quests",
                  label: "Quests",
                })}
                style={{ ["--c"]: ACCENT.quests } as React.CSSProperties}
                className="group flex items-center gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--c)_25%,transparent)] bg-[color-mix(in_srgb,var(--c)_10%,transparent)] p-5 transition-all hover:border-[color-mix(in_srgb,var(--c)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--c)_18%,transparent)] hover:scale-[1.02]"
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
          <div className="mm-glass rounded-2xl flex flex-col items-center px-6 py-16 text-center">
            <span
              className="grid h-16 w-16 place-items-center rounded-2xl"
              style={{
                background: "color-mix(in srgb, var(--mm-gold) 15%, transparent)",
                color: "var(--mm-gold)",
              }}
            >
              <Icon icon="game-icons:treasure-map" width={36} />
            </span>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl tracking-wide sm:text-3xl">
              No active quests right now
            </h2>
            <p className="mx-auto mt-2.5 max-w-md text-sm text-[var(--mm-text-dim)] leading-relaxed">
              Scavenger trails open during live Mythical Mecca festival gatherings. Keep an eye on our calendar for the next gathering and come ready to explore!
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/#calendar" className="mm-btn mm-btn-primary text-xs">
                <Icon icon="mdi:calendar-month-outline" width={16} />
                <span>View Event Calendar</span>
              </Link>
              <Link href="/partners" className="mm-btn mm-btn-ghost text-xs">
                <Icon icon="game-icons:anvil" width={16} />
                <span>Browse Partners</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
