import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Icon } from "@/components/icon";

export type NavItem = {
  href: string;
  label: string;
  icon?: string;
  sub?: string;
  color?: string;
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
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] px-4 py-6 backdrop-blur-md md:flex">
        <Link
          href="/dashboard"
          className="px-2 font-[family-name:var(--font-display)] text-sm tracking-widest"
        >
          MYTHICAL<span className="mm-gradient-text"> MECHA</span>
        </Link>
        <p className="mt-1 px-2 text-[10px] uppercase tracking-[0.25em] text-[var(--mm-gold)]">
          {area}
        </p>

        <nav className="mt-8 flex flex-col gap-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[color-mix(in_srgb,var(--mm-elevated)_60%,transparent)]"
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
            <Icon icon="mdi:arrow-left" width={15} /> Guild Hall
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

      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
