import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLiveEvent } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { getUserXp, rankForXp } from "@/lib/gamification";
import { SyncGauge } from "@/components/sync-gauge";

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
              "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(124,58,237,0.12))",
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
            Set out
          </Link>
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
            Welcome back, <span className="mm-gradient-text">{name}</span>
          </h1>
          <p className="mt-2 text-[var(--mm-text-dim)]">
            {rank.next
              ? `${rank.toNext} renown to ${rank.next}.`
              : "Highest standing achieved."}
          </p>
        </div>
        <SyncGauge pct={rank.pct} rank={rank.rank} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/hunts" className="mm-glass p-6 transition hover:border-[var(--mm-gold)]">
          <p className="font-[family-name:var(--font-display)] text-lg">Quests</p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Scavenger trails & leaderboards
          </p>
        </Link>
        <Link href="/arcade" className="mm-glass p-6 transition hover:border-[var(--mm-gold)]">
          <p className="font-[family-name:var(--font-display)] text-lg">Training Yard</p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Trials of skill · {xp} renown earned
          </p>
        </Link>
        <Link href="/events" className="mm-glass p-6 transition hover:border-[var(--mm-gold)]">
          <p className="font-[family-name:var(--font-display)] text-lg">Gatherings</p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Feasts, gatherings & quests
          </p>
        </Link>
      </div>
    </div>
  );
}
