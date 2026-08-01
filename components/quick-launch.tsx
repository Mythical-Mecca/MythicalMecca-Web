"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

type Tile = {
  label: string;
  href: string;
  icon: string;
  accent: string;
  match: (p: string) => boolean;
};

// The four authenticated sections, surfaced as large buttons at the top of
// every page.
const TILES: Tile[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "mdi:home",
    accent: "#4aa8ff",
    match: (p) => p === "/dashboard",
  },
  {
    label: "Events",
    href: "/events",
    icon: "game-icons:campfire",
    accent: "#5cc08c",
    match: (p) => p.startsWith("/events"),
  },
  {
    label: "Quests",
    href: "/quests",
    icon: "game-icons:treasure-map",
    accent: "#9a6cff",
    match: (p) => p.startsWith("/quests"),
  },
  {
    label: "Partners",
    href: "/partners",
    icon: "game-icons:anvil",
    accent: "#E18D01",
    match: (p) => p.startsWith("/partners"),
  },
];

export function QuickLaunch() {
  const path = usePathname() ?? "";

  return (
    <nav
      aria-label="Primary sections"
      className="grid grid-cols-4 gap-2.5 sm:gap-3"
    >
      {TILES.map((t) => {
        const active = t.match(path);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            style={
              {
                ["--c"]: t.accent,
                boxShadow: active ? `0 10px 30px -16px ${t.accent}` : undefined,
              } as React.CSSProperties
            }
            className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition sm:p-4 ${
              active
                ? "border-[color-mix(in_srgb,var(--c)_55%,transparent)] bg-[color-mix(in_srgb,var(--c)_13%,transparent)]"
                : "border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_45%,transparent)] hover:border-[color-mix(in_srgb,var(--c)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--c)_8%,transparent)]"
            }`}
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-xl transition group-hover:scale-105 sm:h-14 sm:w-14"
              style={{
                background: `color-mix(in srgb, ${t.accent} ${
                  active ? "24%" : "15%"
                }, transparent)`,
                color: t.accent,
              }}
            >
              <Icon icon={t.icon} width={28} />
            </span>
            <span
              className="text-[11px] font-semibold leading-tight sm:text-xs"
              style={{ color: active ? t.accent : "var(--mm-text-dim)" }}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
