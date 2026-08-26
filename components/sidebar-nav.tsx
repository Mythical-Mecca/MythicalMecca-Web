"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import type { NavItem } from "@/components/dashboard-shell";

/**
 * The admin / partner sidebar list.
 *
 * Split out of `DashboardShell` because it needs the current path: the sidebar
 * had no active state at all, so the only "you are here" signal in either
 * portal was the breadcrumb. The overview entry matches exactly; every other
 * entry matches its subtree, so `/admin/events/123` still lights up Events.
 */
export function SidebarNav({ nav, area }: { nav: NavItem[]; area: string }) {
  const path = usePathname() ?? "";
  const rootHref = nav[0]?.href;

  return (
    <nav aria-label={`${area} sections`} className="mt-8 flex flex-col gap-1.5">
      {nav.map((item) => {
        const active =
          item.href === rootHref
            ? path === item.href
            : path === item.href || path.startsWith(`${item.href}/`);
        const color = item.color ?? "#9aa3bd";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{ ["--c"]: color } as React.CSSProperties}
            className={`group flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 transition ${
              active
                ? "bg-[color-mix(in_srgb,var(--c)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--c)_38%,transparent)]"
                : "hover:bg-[color-mix(in_srgb,var(--mm-elevated)_60%,transparent)] active:bg-[color-mix(in_srgb,var(--mm-elevated)_75%,transparent)]"
            }`}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition group-hover:scale-105"
              style={{
                background: `color-mix(in srgb, ${color} ${active ? "30%" : "13%"}, transparent)`,
                color,
              }}
            >
              {item.icon && <Icon icon={item.icon} width={19} />}
            </span>
            <span className="min-w-0 leading-tight">
              <span
                className={`block truncate text-sm ${active ? "font-semibold" : "font-medium"}`}
                style={{ color: `color-mix(in srgb, ${color} 75%, white)` }}
              >
                {item.label}
              </span>
              {item.sub && (
                <span className="block truncate text-[11px] text-[var(--mm-text-dim)]">
                  {item.sub}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
