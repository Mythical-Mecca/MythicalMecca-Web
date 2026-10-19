"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/tabs";

/**
 * Sub-nav within one stall.
 *
 * Rendered by the [partnerId] layout, which knows the stall but not which child
 * route is showing — so the active tab comes from the pathname rather than a
 * prop. (The outer app/(partner)/layout.tsx can't render this at all: a layout
 * only receives params for its own segment and above.)
 */
export function PartnerHubTabs({ partnerId }: { partnerId: string }) {
  const pathname = usePathname();
  const base = `/partner-hub/${partnerId}`;
  const items = [
    { href: base, label: "Overview" },
    { href: `${base}/profile`, label: "Profile" },
    { href: `${base}/events`, label: "Events" },
    { href: `${base}/gallery`, label: "Gallery" },
    { href: `${base}/offerings`, label: "Products" },
    { href: `${base}/team`, label: "Team" },
  ];
  // Longest matching href wins, so /profile doesn't also light up Overview.
  const active =
    items
      .filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? base;

  return <Tabs items={items} active={active} accent="#E18D01" />;
}
