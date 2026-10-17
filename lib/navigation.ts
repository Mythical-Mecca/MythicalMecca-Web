export interface NavSection {
  href: string;
  partnerHref?: string;
  label: string;
  icon?: string;
}

/** General sections shown on desktop PC navigation bar. */
export const DESKTOP_SECTIONS: NavSection[] = [
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#calendar", label: "Calendar", icon: "mdi:calendar-month-outline" },
  { href: "/quests", label: "Quests" },
  { href: "/collab", label: "Contact" },
];

/** Dedicated partner category tabs shown on base PC desktop nav bar. */
export const DESKTOP_PARTNER_TABS: NavSection[] = [
  { href: "/partners", label: "Partners", icon: "game-icons:anvil" },
  { href: "/#vendors", partnerHref: "/partners#vendors", label: "Vendors", icon: "game-icons:shop" },
  { href: "/#artists", partnerHref: "/partners#artists", label: "Artists", icon: "game-icons:paint-brush" },
  { href: "/#collaborators", partnerHref: "/partners#collaborators", label: "Collaborators", icon: "mdi:handshake-outline" },
];

/** Navigation links for the burger menu (PC & mobile) - contains ONLY the partner tab, omitting vendors/artists/collaborators. */
export const BURGER_SECTIONS: NavSection[] = [
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#calendar", label: "Calendar", icon: "mdi:calendar-month-outline" },
  { href: "/quests", label: "Quests" },
  { href: "/partners", label: "Partners", icon: "game-icons:anvil" },
  { href: "/collab", label: "Contact" },
];

/** Navigation links for the footer - contains ONLY the partner tab, omitting vendors/artists/collaborators. */
export const FOOTER_SECTIONS: NavSection[] = [
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#calendar", label: "Calendar" },
  { href: "/quests", label: "Quests" },
  { href: "/partners", label: "Partners" },
  { href: "/collab", label: "Contact" },
];

/** Legacy export for backward compatibility. */
export const HOME_SECTIONS = FOOTER_SECTIONS;
