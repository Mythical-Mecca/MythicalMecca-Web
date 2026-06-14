import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Pilot";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Welcome back, <span className="mm-gradient-text">{name}</span>
        </h1>
        <p className="mt-2 text-[var(--mm-text-dim)]">
          Your hangar is online. Phase 0 foundation — the sortie card, sync gauge
          and division feeds land in later phases.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="mm-glass p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">Rank</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl">Initiate</p>
        </div>
        <div className="mm-glass p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">Sync rate</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl">0%</p>
        </div>
        <div className="mm-glass p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">XP core</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl">0</p>
        </div>
      </div>
    </div>
  );
}
