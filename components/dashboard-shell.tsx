import Link from "next/link";
import { signOut } from "@/lib/auth";

export type NavItem = { href: string; label: string };

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
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] px-4 py-6 md:flex">
        <Link
          href="/dashboard"
          className="px-2 font-[family-name:var(--font-display)] text-sm tracking-widest"
        >
          MYTHIC<span className="mm-gradient-text"> MECHA</span>
        </Link>
        <p className="mt-1 px-2 text-[10px] uppercase tracking-[0.25em] text-[var(--mm-gold)]">
          {area}
        </p>

        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          className="mt-auto"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="mm-btn mm-btn-ghost w-full justify-center text-sm">
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
