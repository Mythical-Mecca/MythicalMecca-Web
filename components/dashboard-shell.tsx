import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { Breadcrumbs, type CrumbRoot } from "@/components/breadcrumbs";
import { NavMenu, type NavMenuItem } from "@/components/nav-menu";
import { SidebarNav } from "@/components/sidebar-nav";

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
  icon: item.icon ?? "mdi:circle-small",
  color: item.color ?? "#9aa3bd",
});

const PUBLIC_ITEM: NavMenuItem = {
  href: "/",
  title: "Public site",
  icon: "mdi:home",
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
  const menuItems = [...nav.map(toMenuItem), PUBLIC_ITEM];
  const crumbRoot: CrumbRoot = {
    href: nav[0]?.href ?? "/",
    label: area,
    icon: nav[0]?.icon ?? "mdi:view-dashboard-outline",
  };

  return (
    <div className="flex min-h-screen">
      <a href="#main-content" className="mm-skip">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)] px-4 py-6 md:flex">
        <Brand href="/" className="px-2 text-sm" />
        <p className="mt-1 px-2 text-[10px] uppercase tracking-[0.25em] text-[var(--mm-gold)]">
          {area}
        </p>

        <SidebarNav nav={nav} area={area} />

        <div className="mt-auto space-y-2">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:arrow-left" width={15} /> Public site
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
            <Brand href="/" className="shrink-0 text-sm" />
            <span className="truncate text-[10px] uppercase tracking-[0.25em] text-[var(--mm-gold)]">
              {area}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavMenu items={menuItems} title={area} />
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

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-6 py-8 md:px-10"
        >
          <div className="mb-5 empty:hidden">
            <Breadcrumbs root={crumbRoot} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
