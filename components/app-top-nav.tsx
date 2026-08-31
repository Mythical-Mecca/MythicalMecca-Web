import { signOut } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";
import { NavMenu, type NavMenuItem } from "@/components/nav-menu";
import { Brand } from "@/components/brand";
import { SectionNav } from "@/components/section-nav";
import { ACCENT } from "@/lib/accents";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/**
 * News, guilds, lists, the arcade and LFG are cut from the launch scope — their
 * code and tables are gone (LFG lives in Discord for now). Old URLs redirect to
 * a live section via next.config.ts.
 */
const ITEMS = {
  dashboard: {
    href: "/dashboard",
    title: "Dashboard",
    icon: "game-icons:castle",
    color: ACCENT.dashboard,
  },
  profile: {
    href: "/profile",
    title: "Profile",
    icon: "game-icons:visored-helm",
    color: ACCENT.profile,
  },
  events: {
    href: "/events",
    title: "Events",
    icon: "game-icons:campfire",
    color: ACCENT.events,
  },
  quests: {
    href: "/quests",
    title: "Quests",
    icon: "game-icons:treasure-map",
    color: ACCENT.quests,
  },
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
    ITEMS.dashboard,
    ITEMS.profile,
    ITEMS.events,
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

  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_88%,transparent)]">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5"
      >
        <Brand href="/dashboard" className="shrink-0" />
        {/* The three sections live here on md+, so the only thing hidden behind
            the menu button is the account tier — profile, stall, admin, sign
            out. Below md there isn't room for them and the menu carries all. */}
        <SectionNav />
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
