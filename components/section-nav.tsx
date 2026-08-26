"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { ACCENT } from "@/lib/accents";

type Section = {
  href: string;
  label: string;
  icon: string;
  accent: string;
  match: (p: string) => boolean;
};

/**
 * The three member sections, as persistent links in the header bar.
 *
 * This replaces the `QuickLaunch` tile grid. The tiles were a second copy of
 * the nav menu's contents rendered at the top of every page — four 100px-tall
 * buttons that, together with the header, the back pill and the breadcrumb,
 * pushed the page's own H1 341px down a 720px desktop viewport and 315px down a
 * phone. Same destinations, one line, and now they sit in the header where a
 * reader looks for navigation rather than in the content column.
 */
const SECTIONS: Section[] = [
  {
    href: "/events",
    label: "Events",
    icon: "game-icons:campfire",
    accent: ACCENT.events,
    match: (p) => p.startsWith("/events"),
  },
  {
    href: "/quests",
    label: "Quests",
    icon: "game-icons:treasure-map",
    accent: ACCENT.quests,
    match: (p) => p.startsWith("/quests") || p.startsWith("/q/"),
  },
  {
    href: "/partners",
    label: "Partners",
    icon: "game-icons:anvil",
    accent: ACCENT.partners,
    match: (p) => p.startsWith("/partners"),
  },
];

export function SectionNav() {
  const path = usePathname() ?? "";

  return (
    <ul className="hidden items-center gap-1 md:flex">
      {SECTIONS.map((s) => {
        const active = s.match(path);
        return (
          <li key={s.href}>
            <Link
              href={s.href}
              aria-current={active ? "page" : undefined}
              style={{ ["--c"]: s.accent } as React.CSSProperties}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm transition-colors ${
                active
                  ? "bg-[color-mix(in_srgb,var(--c)_14%,transparent)] font-semibold text-[color-mix(in_srgb,var(--c)_75%,white)]"
                  : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              }`}
            >
              <Icon
                icon={s.icon}
                width={17}
                style={active ? { color: s.accent } : undefined}
              />
              {s.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
