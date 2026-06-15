import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLiveEvent } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { getUserXp, rankForXp } from "@/lib/gamification";
import { SyncGauge } from "@/components/sync-gauge";
import { Icon } from "@/components/icon";

// slightly transparent so the scene shows through the cards
const softCard = {
  background: "color-mix(in srgb, var(--mm-surface) 40%, transparent)",
} as const;

const LINKS = [
  {
    href: "/hunts",
    title: "Quests",
    desc: "Scavenger trails & leaderboards",
    icon: "game-icons:crossed-swords",
  },
  {
    href: "/arcade",
    title: "Training Yard",
    desc: "Trials of skill",
    icon: "mdi:target",
  },
  {
    href: "/events",
    title: "Gatherings",
    desc: "Feasts, gatherings & quests",
    icon: "game-icons:campfire",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Adventurer";
  const [liveEvent, xp] = await Promise.all([
    getLiveEvent(),
    getUserXp(session!.user.id),
  ]);
  const rank = rankForXp(xp);

  return (
    <div className="space-y-8">
        {liveEvent && (
          <div
            className="rounded-2xl border border-[var(--mm-live)] p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(92,192,140,0.16), rgba(44,123,229,0.14))",
            }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--mm-live)]">
              <span className="mm-dot-live" /> A gathering awaits
            </div>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
              {liveEvent.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
              {formatDateTime(liveEvent.startsAt)} · {liveEvent.location}
            </p>
            <Link
              href={`/events/${liveEvent.slug}`}
              className="mm-btn mm-btn-primary mt-4 text-sm"
            >
              <Icon icon="mdi:arrow-right" width={16} /> View event
            </Link>
          </div>
        )}

        {/* Welcome card */}
        <section
          className="mm-glass flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center"
          style={softCard}
        >
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--mm-gold)]">
              <Icon icon="game-icons:gamepad" width={16} /> Player one
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide md:text-4xl">
              Welcome back, <span className="mm-gradient-text">{name}</span>
            </h1>
            <p className="mt-2 text-[var(--mm-text-dim)]">
              {rank.next
                ? `${rank.toNext} renown to ${rank.next}.`
                : "Highest standing achieved."}
            </p>
          </div>
          <SyncGauge pct={rank.pct} rank={rank.rank} />
        </section>

        {/* Explore */}
        <section>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide">
            <Icon icon="game-icons:compass" width={24} className="text-[var(--mm-gold)]" />
            Explore
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="mm-glass group p-6 transition hover:border-[var(--mm-violet)]"
                style={softCard}
              >
                <Icon icon={l.icon} width={30} className="text-[var(--mm-gold)]" />
                <p className="mt-3 font-[family-name:var(--font-display)] text-lg group-hover:text-[var(--mm-gold)]">
                  {l.title}
                </p>
                <p className="mt-1 text-sm text-[var(--mm-text-dim)]">{l.desc}</p>
              </Link>
            ))}
          </div>
        </section>
    </div>
  );
}
