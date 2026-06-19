import Link from "next/link";
import { signOut } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";
import { Icon } from "@/components/icon";
import { NavMenu, type NavMenuItem } from "@/components/nav-menu";
import { Brand } from "@/components/brand";

const NAV: NavMenuItem[] = [
  {
    href: "/dashboard",
    title: "Guild Hall",
    desc: "Your home base & standing",
    icon: "game-icons:castle",
    color: "#4aa8ff",
  },
  {
    href: "/events",
    title: "Events",
    desc: "Feasts, gatherings & quests",
    icon: "game-icons:campfire",
    color: "#5cc08c",
  },
  {
    href: "/hunts",
    title: "Quests",
    desc: "Scavenger trails & leaderboards",
    icon: "game-icons:crossed-swords",
    color: "#9a6cff",
  },
  {
    href: "/arcade",
    title: "Training Yard",
    desc: "Trials of skill",
    icon: "mdi:target",
    color: "#48c8d6",
  },
  {
    href: "/armory",
    title: "Partners",
    desc: "The Armory — makers & merchants",
    icon: "game-icons:anvil",
    color: "#E18D01",
  },
  {
    href: "/profile",
    title: "Character",
    desc: "Your hero & achievements",
    icon: "game-icons:visored-helm",
    color: "#e0b0ff",
  },
];

const FORGE_ITEM: NavMenuItem = {
  href: "/forge",
  title: "Forge",
  desc: "Vendor workshop",
  icon: "game-icons:anvil",
  color: "#E18D01",
};

const KEEP_ITEM: NavMenuItem = {
  href: "/command",
  title: "The Keep",
  desc: "Command & control",
  icon: "game-icons:tower-flag",
  color: "#FFB13D",
};

export function AppTopNav({
  role,
  liveEvent,
}: {
  role: Role;
  liveEvent: { slug: string; title: string } | null;
}) {
  const items: NavMenuItem[] = [
    ...NAV,
    ...(roleAtLeast(role, "vendor") ? [FORGE_ITEM] : []),
    ...(roleAtLeast(role, "admin") ? [KEEP_ITEM] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_62%,transparent)] backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-4">
          <Brand href="/dashboard" className="shrink-0" />
          {liveEvent && (
            <Link
              href={`/events/${liveEvent.slug}`}
              className="hidden min-w-0 items-center gap-2 rounded-full border border-[var(--mm-live)] px-3 py-1 text-xs text-[var(--mm-live)] sm:inline-flex"
            >
              <span className="mm-dot-live shrink-0" />{" "}
              <span className="truncate">{liveEvent.title}</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs uppercase tracking-widest text-[var(--mm-text-dim)] sm:inline">
            {role}
          </span>
          <NavMenu items={items} />
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
