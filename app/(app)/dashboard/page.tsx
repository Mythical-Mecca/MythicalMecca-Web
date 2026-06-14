import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLiveEvent } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { getUserXp, rankForXp } from "@/lib/gamification";
import { SyncGauge } from "@/components/sync-gauge";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Pilot";
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
            <span className="mm-dot-live" /> Sortie available
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
            Launch
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
              ? `${rank.toNext} XP to ${rank.next}.`
              : "Maximum rank achieved."}
          </p>
        </div>
        <SyncGauge pct={rank.pct} rank={rank.rank} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/hunts" className="mm-glass p-6 transition hover:border-[var(--mm-violet)]">
          <p className="font-[family-name:var(--font-display)] text-lg">Ops</p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Scavenger hunts & leaderboards
          </p>
        </Link>
        <Link href="/arcade" className="mm-glass p-6 transition hover:border-[var(--mm-violet)]">
          <p className="font-[family-name:var(--font-display)] text-lg">Arcade</p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Training sims · {xp} XP banked
          </p>
        </Link>
        <Link href="/events" className="mm-glass p-6 transition hover:border-[var(--mm-violet)]">
          <p className="font-[family-name:var(--font-display)] text-lg">Events</p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Upcoming ops & sorties
          </p>
        </Link>
      </div>
    </div>
  );
}
