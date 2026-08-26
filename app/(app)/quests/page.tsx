import Link from "next/link";
import { auth } from "@/lib/auth";
import { SectionHero } from "@/components/section-hero";
import { listHunts } from "@/lib/hunts";
import { Icon } from "@/components/icon";

export const metadata = { title: "Quests" };

export default async function QuestBoardPage() {
  const session = await auth();
  const hunts = await listHunts(session?.user?.id);

  return (
    <>
      <SectionHero section="quests" />

      <div className="pt-8 pb-24">
        {hunts.length === 0 ? (
          <div className="mm-glass p-8 text-center">
            <Icon
              icon="game-icons:treasure-map"
              width={40}
              className="mx-auto text-[var(--mm-text-dim)]"
            />
            <p className="mt-3 font-[family-name:var(--font-display)] text-lg">
              No trails open right now
            </p>
            <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
              Quests run alongside events — new ones appear when the next
              gathering opens its doors.
            </p>
            <Link href="/events" className="mm-btn mm-btn-ghost mt-5">
              See what&apos;s on
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {hunts.map((h) => {
              const pct = h.steps ? Math.round((h.done / h.steps) * 100) : 0;
              const complete = h.steps > 0 && h.done === h.steps;
              return (
                <Link
                  key={h.slug}
                  href={`/quests/${h.slug}`}
                  className="mm-glass group flex flex-col p-5 transition hover:border-[var(--mm-violet)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-[family-name:var(--font-display)] text-xl leading-tight group-hover:text-[var(--mm-gold)]">
                      {h.title}
                    </h2>
                    {complete && (
                      <Icon
                        icon="game-icons:laurels-trophy"
                        width={22}
                        className="shrink-0 text-[var(--mm-gold)]"
                      />
                    )}
                  </div>

                  {h.eventTitle && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--mm-gold)]">
                      <Icon icon="game-icons:campfire" width={13} />
                      {h.eventTitle}
                    </p>
                  )}

                  <p className="mt-2 flex-1 text-sm text-[var(--mm-text-dim)]">
                    {h.description}
                  </p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="uppercase tracking-widest text-[var(--mm-text-dim)]">
                        {h.done > 0
                          ? `${h.done} of ${h.steps} cleared`
                          : `${h.steps} objectives`}
                      </span>
                      {h.done > 0 && !complete && (
                        <span className="text-[var(--mm-gold)]">Continue →</span>
                      )}
                      {h.done === 0 && (
                        <span className="text-[var(--mm-gold)]">Start →</span>
                      )}
                    </div>
                    {h.done > 0 && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--mm-surface)]">
                        <div
                          className="h-full rounded-full bg-[var(--mm-gold)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
