import { signOut } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";
import { NavMenu, type NavMenuItem } from "@/components/nav-menu";
import { Brand } from "@/components/brand";
import { ACCENT } from "@/lib/accents";
import Link from "next/link";
import { Icon } from "@/components/icon";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

const ITEMS = {
  partners: {
    href: "/partners",
    title: "Partners",
    icon: "game-icons:anvil",
    color: ACCENT.partners,
  },
  vendors: {
    href: "/partners#vendors",
    title: "Vendors",
    icon: "game-icons:shop",
    color: ACCENT.marketplace,
  },
  artists: {
    href: "/partners#artists",
    title: "Artists",
    icon: "game-icons:paint-brush",
    color: ACCENT.marketplace,
  },
  collaborators: {
    href: "/partners#collaborators",
    title: "Collaborators",
    icon: "mdi:handshake-outline",
    color: ACCENT.marketplace,
  },
  quests: {
    href: "/quests",
    title: "Quests",
    icon: "game-icons:treasure-map",
    color: ACCENT.quests,
  },
  partnerHub: {
    href: "/partner-hub",
    title: "Partner Hub",
    icon: "mdi:storefront-outline",
    color: ACCENT.marketplace,
  },
  apply: {
    href: "/apply",
    title: "Apply for a stall",
    icon: "game-icons:shop",
    color: ACCENT.marketplace,
  },
  admin: {
    href: "/admin",
    title: "Admin",
    icon: "game-icons:tower-flag",
    color: ACCENT.admin,
  },
} satisfies Record<string, NavMenuItem>;

/**
 * `hasPartner` comes from a partner_members count, not the JWT role — the role
 * in the token goes stale until the next sign-in, which would hide the hub from
 * someone who just accepted a team invite.
 */
function buildItems(role: Role, hasPartner: boolean): NavMenuItem[] {
  const isPartner = hasPartner || roleAtLeast(role, "admin");
  return [
    ITEMS.quests,
    ITEMS.partners,
    isPartner ? ITEMS.partnerHub : ITEMS.apply,
    ...(roleAtLeast(role, "admin") ? [ITEMS.admin] : []),
  ];
}

export function AppTopNav({
  role,
  hasPartner = false,
}: {
  role: Role;
  hasPartner?: boolean;
}) {
  const menuItems = buildItems(role, hasPartner);
  const brandHref = roleAtLeast(role, "admin")
    ? "/admin"
    : hasPartner
      ? "/partner-hub"
      : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_88%,transparent)]">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5"
      >
        <Brand href={brandHref} className="shrink-0" />
        <ul className="hidden items-center gap-1 md:flex">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              <Icon icon="mdi:home" width={14} />
              Home
            </Link>
          </li>
          <li>
            <a
              href="/#calendar"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--mm-gold)_20%,transparent)] hover:text-[var(--mm-text)]"
            >
              <Icon icon="mdi:calendar-month-outline" width={14} />
              Calendar
            </a>
          </li>
          <li>
            <Link
              href="/quests"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              <Icon icon="game-icons:treasure-map" width={14} />
              Quests
            </Link>
          </li>
          <li>
            <div className="flex items-center rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_70%,transparent)] p-1 gap-0.5 ml-1">
              <Link
                href="/partners"
                className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] transition"
              >
                <Icon icon="game-icons:anvil" width={13} />
                Partners
              </Link>
              <a
                href="/partners#vendors"
                className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] transition"
              >
                <Icon icon="game-icons:shop" width={13} />
                Vendors
              </a>
              <a
                href="/partners#artists"
                className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] transition"
              >
                <Icon icon="game-icons:paint-brush" width={13} />
                Artists
              </a>
              <a
                href="/partners#collaborators"
                className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] transition"
              >
                <Icon icon="mdi:handshake-outline" width={13} />
                Collaborators
              </a>
            </div>
          </li>
        </ul>
        <div className="ml-auto shrink-0">
          <NavMenu
            items={menuItems}
            signOutAction={signOutAction}
            trigger={{ icon: "mdi:menu", ariaLabel: "Open navigation menu" }}
          />
        </div>
      </nav>
    </header>
  );
}
