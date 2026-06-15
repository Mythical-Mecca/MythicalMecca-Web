import Link from "next/link";
import { signOut } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";
import { Icon } from "@/components/icon";

const NAV = [
  { href: "/dashboard", label: "Guild Hall", icon: "game-icons:castle" },
  { href: "/events", label: "Gatherings", icon: "game-icons:campfire" },
  { href: "/hunts", label: "Quests", icon: "game-icons:crossed-swords" },
  { href: "/arcade", label: "Training Yard", icon: "mdi:target" },
  { href: "/armory", label: "Armory", icon: "game-icons:anvil" },
  { href: "/profile", label: "Character", icon: "game-icons:visored-helm" },
];

export function AppTopNav({
  role,
  liveEvent,
}: {
  role: Role;
  liveEvent: { slug: string; title: string } | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_62%,transparent)] backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-6">
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
          <div className="hidden items-center gap-5 text-sm text-[var(--mm-text-dim)] lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="inline-flex items-center gap-1.5 hover:text-[var(--mm-text)]"
              >
                <Icon icon={n.icon} width={15} /> {n.label}
              </Link>
            ))}
            {roleAtLeast(role, "vendor") && (
              <Link
                href="/forge"
                className="inline-flex items-center gap-1.5 text-[var(--mm-gold)] hover:text-[var(--mm-gold-hi)]"
              >
                <Icon icon="game-icons:anvil" width={15} /> Forge
              </Link>
            )}
            {roleAtLeast(role, "admin") && (
              <Link
                href="/command"
                className="inline-flex items-center gap-1.5 text-[var(--mm-gold)] hover:text-[var(--mm-gold-hi)]"
              >
                <Icon icon="game-icons:tower-flag" width={15} /> The Keep
              </Link>
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
            <button className="mm-btn mm-btn-ghost text-sm">
              <Icon icon="mdi:logout-variant" width={16} /> Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
