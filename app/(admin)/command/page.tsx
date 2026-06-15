import { getCounts } from "@/lib/admin";
import { PageHeader } from "@/components/form";
import { Icon } from "@/components/icon";

export default async function CommandOverviewPage() {
  const c = await getCounts();
  const cards = [
    { k: "Adventurers", v: c.pilots, icon: "mdi:account-group", color: "#4aa8ff" },
    { k: "Tidings", v: c.posts, icon: "game-icons:scroll-unfurled", color: "#f2b441" },
    { k: "Active gatherings", v: c.activeOps, icon: "game-icons:campfire", color: "#5cc08c" },
    { k: "Errors (24h)", v: c.errors24h, icon: "mdi:alert-outline", color: "#f0795a" },
  ];
  const dbConnected = !!process.env.DATABASE_URL;

  return (
    <div className="space-y-6">
      <PageHeader
        title="The Keep"
        sub="Command overview — the state of the realm at a glance."
        icon="game-icons:tower-flag"
        accent="#f2b441"
      />

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
            <span
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: `${x.color}22`, color: x.color }}
            >
              <Icon icon={x.icon} width={22} />
            </span>
            <p className="mt-3 text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              {x.k}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
              {x.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
