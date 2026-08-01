import Link from "next/link";

export type TabItem = { href: string; label: string };

/**
 * Pill tab row — used for admin sub-nav (Partners / Applications / …) and for
 * status/origin filters (Pending / Approved / …). One look everywhere: an
 * accent-tinted active pill, muted inactive pills.
 */
export function Tabs({
  items,
  active,
  accent = "var(--mm-gold)",
}: {
  items: TabItem[];
  /** The href of the currently-active tab. */
  active: string;
  /** Accent colour for the active pill. */
  accent?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => {
        const isActive = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full border px-4 py-1.5 text-sm transition-colors"
            style={
              isActive
                ? {
                    borderColor: accent,
                    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                    color: accent,
                  }
                : {
                    borderColor: "var(--mm-border)",
                    color: "var(--mm-text-dim)",
                  }
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
