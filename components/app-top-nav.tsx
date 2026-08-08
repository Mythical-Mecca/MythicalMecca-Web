import { signOut } from "@/lib/auth";
import { roleAtLeast, type Role } from "@/lib/rbac";
import {
  NavMenu,
  type NavMenuItem,
  type NavMenuSection,
} from "@/components/nav-menu";
import { Brand } from "@/components/brand";

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
    desc: "Your home base & standing",
    icon: "game-icons:castle",
    color: "#4aa8ff",
  },
  profile: {
    href: "/profile",
    title: "Profile",
    desc: "Your hero & achievements",
    icon: "game-icons:visored-helm",
    color: "#4aa8ff",
  },
  events: {
    href: "/events",
    title: "Events",
    desc: "Feasts, gatherings & tournaments",
    icon: "game-icons:campfire",
    color: "#5cc08c",
  },
  quests: {
    href: "/quests",
    title: "Quests",
    desc: "Scavenger trails & leaderboards",
    icon: "game-icons:treasure-map",
    color: "#5cc08c",
  },
  partners: {
    href: "/partners",
    title: "Partners",
    desc: "Makers, merchants & artists",
    icon: "game-icons:anvil",
    color: "#5cc08c",
  },
  partnerHub: {
    href: "/partner-hub",
    title: "Partner Hub",
    desc: "Manage your shop & gallery",
    icon: "mdi:storefront-outline",
    color: "#E18D01",
  },
  apply: {
    href: "/apply",
    title: "Apply for a stall",
    desc: "Become a Mythical Mecca partner",
    icon: "game-icons:shop",
    color: "#E18D01",
  },
  admin: {
    href: "/admin",
    title: "Admin",
    desc: "Site management",
    icon: "game-icons:tower-flag",
    color: "#FFB13D",
  },
} satisfies Record<string, NavMenuItem>;

/**
 * `hasPartner` comes from a partner_members count, not the JWT role — the role
 * in the token goes stale until the next sign-in, which would hide the hub from
 * someone who just accepted a team invite.
 */
function buildSections(role: Role, hasPartner: boolean): NavMenuSection[] {
  const isPartner = hasPartner || roleAtLeast(role, "admin");
  return [
    {
      title: "Home base",
      subtitle: "Your standing & story",
      icon: "game-icons:castle",
      color: "#4aa8ff",
      items: [ITEMS.dashboard, ITEMS.profile],
    },
    {
      title: "The hall",
      subtitle: "Gather, play & explore",
      icon: "game-icons:campfire",
      color: "#5cc08c",
      items: [ITEMS.events, ITEMS.quests, ITEMS.partners],
    },
    {
      title: "Marketplace",
      subtitle: "Makers & merchants",
      icon: "game-icons:anvil",
      color: "#E18D01",
      items: isPartner ? [ITEMS.partnerHub] : [ITEMS.apply],
    },
    {
      title: "Manage",
      subtitle: "Command & control",
      icon: "game-icons:tower-flag",
      color: "#FFB13D",
      items: roleAtLeast(role, "admin") ? [ITEMS.admin] : [],
    },
  ];
}

export function AppTopNav({
  role,
  hasPartner = false,
}: {
  role: Role;
  hasPartner?: boolean;
}) {
  const sections = buildSections(role, hasPartner);

  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_88%,transparent)]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Brand href="/dashboard" className="shrink-0" />
        <NavMenu
          sections={sections}
          signOutAction={signOutAction}
          trigger={{ icon: "mdi:menu" }}
        />
      </nav>
    </header>
  );
}
