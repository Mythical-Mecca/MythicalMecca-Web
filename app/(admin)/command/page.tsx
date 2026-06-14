import { getCounts } from "@/lib/admin";

export default async function CommandOverviewPage() {
  const c = await getCounts();
  const cards = [
    { k: "Adventurers", v: c.pilots },
    { k: "Tidings", v: c.posts },
    { k: "Active gatherings", v: c.activeOps },
    { k: "Errors (24h)", v: c.errors24h },
  ];
  const dbConnected = !!process.env.DATABASE_URL;

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        The <span className="mm-gradient-text">Keep</span>
      </h1>

      {!dbConnected && (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm text-[var(--mm-text-dim)]">
          No database connected — counts read zero and management writes are
          no-ops. Set <code className="text-[var(--mm-gold)]">DATABASE_URL</code>{" "}
          and run <code className="text-[var(--mm-gold)]">pnpm db:push</code> to
          go live.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((x) => (
          <div key={x.k} className="mm-glass p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              {x.k}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
              {x.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
