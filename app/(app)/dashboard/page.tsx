import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLiveEvent } from "@/lib/content";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Pilot";
  const liveEvent = await getLiveEvent();

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

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Welcome back, <span className="mm-gradient-text">{name}</span>
        </h1>
        <p className="mt-2 text-[var(--mm-text-dim)]">
          Your hangar is online.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="mm-glass p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            Rank
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl">
            Initiate
          </p>
        </div>
        <div className="mm-glass p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            Sync rate
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl">0%</p>
        </div>
        <div className="mm-glass p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            XP core
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl">0</p>
        </div>
      </div>
    </div>
  );
}
