import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { PageNav } from "@/components/page-nav";
import { NavMenu, type NavMenuItem } from "@/components/nav-menu";

export type NavItem = {
  href: string;
  label: string;
  icon?: string;
  sub?: string;
  color?: string;
};

const toMenuItem = (item: NavItem): NavMenuItem => ({
  href: item.href,
  title: item.label,
  desc: item.sub ?? "",
  icon: item.icon ?? "mdi:circle-small",
  color: item.color ?? "#9aa3bd",
});

const DASHBOARD_ITEM: NavMenuItem = {
  href: "/dashboard",
  title: "Dashboard",
  desc: "Back to your home base",
  icon: "game-icons:castle",
  color: "#4aa8ff",
};

export function DashboardShell({
  area,
  nav,
  children,
}: {
  area: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const menuItems = [...nav.map(toMenuItem), DASHBOARD_ITEM];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)] px-4 py-6 md:flex">
        <Brand href="/dashboard" className="px-2 text-sm" />
        <p className="mt-1 px-2 text-[10px] uppercase tracking-[0.25em] text-[var(--mm-gold)]">
          {area}
        </p>

        <nav className="mt-8 flex flex-col gap-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[color-mix(in_srgb,var(--mm-elevated)_60%,transparent)] active:bg-[color-mix(in_srgb,var(--mm-elevated)_75%,transparent)]"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition group-hover:scale-105"
                style={{
                  background: `${item.color ?? "#9aa3bd"}22`,
                  color: item.color ?? "var(--mm-text-dim)",
                }}
              >
                {item.icon && <Icon icon={item.icon} width={19} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span
                  className="block truncate text-sm font-medium"
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.label}
                </span>
                {item.sub && (
                  <span className="block truncate text-[11px] text-[var(--mm-text-dim)]">
                    {item.sub}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:arrow-left" width={15} /> Dashboard
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="mm-btn mm-btn-ghost w-full justify-center text-sm">
              <Icon icon="mdi:logout-variant" width={16} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — sidebar is hidden below md, so navigation lives here */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)] px-5 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Brand href="/dashboard" className="shrink-0 text-sm" />
            <span className="truncate text-[10px] uppercase tracking-[0.25em] text-[var(--mm-gold)]">
              {area}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavMenu items={menuItems} title={area} subtitle="Jump to a section" />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                className="mm-btn mm-btn-ghost px-3 text-sm"
                aria-label="Sign out"
              >
                <Icon icon="mdi:logout-variant" width={16} />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 md:px-10">
          <div className="mb-5">
            <PageNav />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
