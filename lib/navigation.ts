export interface NavSection {
  href: string;
  partnerHref?: string;
  label: string;
}

/** Nav items configuration: general sections plus dedicated partner category tabs. */
export const HOME_SECTIONS: NavSection[] = [
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#calendar", label: "Calendar" },
  { href: "/#quests", label: "Quests" },
  { href: "/partners", label: "Partners" },
  { href: "/#vendors", partnerHref: "/partners#vendors", label: "Vendors" },
  { href: "/#artists", partnerHref: "/partners#artists", label: "Artists" },
  { href: "/#collaborators", partnerHref: "/partners#collaborators", label: "Collaborators" },
];
