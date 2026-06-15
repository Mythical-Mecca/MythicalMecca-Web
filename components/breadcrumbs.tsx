"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

const LABELS: Record<string, string> = {
  dashboard: "Guild Hall",
  events: "Gatherings",
  hunts: "Quests",
  hunt: "Quests",
  arcade: "Training Yard",
  armory: "Armory",
  profile: "Character",
  "vendor-application": "Vendor application",
  forge: "Forge",
  command: "The Keep",
  news: "Tidings",
  collab: "Send a raven",
  scan: "Scan",
};

// segments that aren't real pages on their own → don't link them
const REROUTE: Record<string, string> = { hunt: "/hunts" };

function humanize(seg: string): string {
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const path = usePathname();
  if (!path || path === "/" || path === "/dashboard") return null;

  const segs = path.split("/").filter(Boolean);
  const crumbs = segs.map((seg, i) => ({
    href: REROUTE[seg] ?? "/" + segs.slice(0, i + 1).join("/"),
    label: LABELS[seg] ?? humanize(decodeURIComponent(seg)),
    last: i === segs.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--mm-text-dim)]"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 hover:text-[var(--mm-text)]"
      >
        <Icon icon="game-icons:castle" width={15} /> Guild Hall
      </Link>
      {crumbs.map((c) => (
        <span key={c.href + c.label} className="flex items-center gap-1.5">
          <Icon icon="mdi:chevron-right" width={15} className="opacity-50" />
          {c.last ? (
            <span className="text-[var(--mm-text)]">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-[var(--mm-text)]">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
