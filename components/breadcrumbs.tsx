"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  // sections
  events: "Events",
  quests: "Quests",
  // sub-sections
  partners: "Partners",
  profile: "Profile",
  apply: "Partner application",
  submit: "Submit",
  queue: "Queue",
  "partner-hub": "Partner Hub",
  admin: "Admin",
  categories: "Categories",
  applications: "Applications",
  reviews: "Reviews",
  gallery: "Gallery",
  telemetry: "Logs",
  collab: "Contact",
  scan: "Scan",
  station: "Station",
  q: "Check in",
};

function humanize(seg: string): string {
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Raw ids and signed tag tokens are noise in a breadcrumb — "Station /
 * D0547017 Abcd 4f37…" tells nobody anything. Slugs still read fine, so only
 * opaque segments are dropped.
 */
function isOpaqueId(seg: string): boolean {
  return UUID.test(seg) || (seg.length > 24 && !seg.includes("-"));
}

export function Breadcrumbs() {
  const path = usePathname();
  if (!path || path === "/" || path === "/dashboard") return null;

  const segs = path.split("/").filter(Boolean);
  const visible = segs
    .map((seg, i) => ({
      href: "/" + segs.slice(0, i + 1).join("/"),
      seg,
      label: LABELS[seg] ?? humanize(decodeURIComponent(seg)),
    }))
    .filter((c) => !isOpaqueId(c.seg));
  // Recomputed after filtering: dropping a trailing id promotes its parent to
  // last, and the last crumb must render as text rather than a link to a URL
  // that may not resolve on its own (e.g. /q).
  const crumbs = visible.map((c, i) => ({
    ...c,
    last: i === visible.length - 1,
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
        <Icon icon="game-icons:castle" width={15} /> Dashboard
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
