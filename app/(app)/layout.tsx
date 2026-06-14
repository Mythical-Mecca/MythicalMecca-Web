import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { signOut } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { getLiveEvent } from "@/lib/content";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("member");
  const role = session.user.role;
  const liveEvent = await getLiveEvent();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-bg)_82%,transparent)] backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-7">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-display)] tracking-widest"
            >
              MYTHIC<span className="mm-gradient-text"> MECHA</span>
            </Link>
            {liveEvent && (
              <Link
                href={`/events/${liveEvent.slug}`}
                className="hidden items-center gap-2 rounded-full border border-[var(--mm-live)] px-3 py-1 text-xs text-[var(--mm-live)] sm:inline-flex"
              >
                <span className="mm-dot-live" /> {liveEvent.title}
              </Link>
            )}
            <div className="hidden items-center gap-6 text-sm text-[var(--mm-text-dim)] md:flex">
              <Link href="/dashboard" className="hover:text-[var(--mm-text)]">Hangar</Link>
              <Link href="/events" className="hover:text-[var(--mm-text)]">Events</Link>
              <Link href="/hunts" className="hover:text-[var(--mm-text)]">Ops</Link>
              <Link href="/arcade" className="hover:text-[var(--mm-text)]">Arcade</Link>
              <Link href="/armory" className="hover:text-[var(--mm-text)]">Armory</Link>
              <Link href="/profile" className="hover:text-[var(--mm-text)]">Loadout</Link>
              {roleAtLeast(role, "vendor") && (
                <Link href="/forge" className="text-[var(--mm-gold)] hover:text-[var(--mm-gold-hi)]">Forge</Link>
              )}
              {roleAtLeast(role, "admin") && (
                <Link href="/command" className="text-[var(--mm-gold)] hover:text-[var(--mm-gold-hi)]">Command</Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs uppercase tracking-widest text-[var(--mm-text-dim)] sm:inline">
              {role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="mm-btn mm-btn-ghost text-sm">Eject</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
