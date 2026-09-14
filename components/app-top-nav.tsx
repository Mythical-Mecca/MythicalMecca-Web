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
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              <Icon icon="mdi:home" width={17} />
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/partners"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              <Icon icon="game-icons:anvil" width={17} />
              Partners
            </Link>
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
