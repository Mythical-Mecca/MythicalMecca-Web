import Link from "next/link";
import { Icon } from "@/components/icon";
import { accentText } from "@/lib/accents";

export interface SectionTabItem {
  href: string;
  label: string;
  icon?: string;
  /**
   * A number worth seeing before you click — photos, unread reports, attached
   * quests. `0` renders as a muted zero rather than being hidden: "no photos"
   * is information too, and a count that appears and disappears makes the rail
   * jump around as you move between records.
   */
  count?: number;
  /** `danger` tints the segment red — for the tab holding destructive tools. */
  tone?: "default" | "danger";
}

/**
 * The section rail — one control holding every section of a record.
 *
 * Where `Tabs` is a row of free-floating pills, this is a single seated
 * surface with the active segment lit inside it. That difference is the point:
 * a shared trough reads as "these are the parts of one thing, and you are
 * here", which is what a record editor needs, whereas loose pills read as
 * filters or unrelated links. Each segment carries an icon and, where it means
 * something, a count — so the rail says what is inside each section before you
 * open it.
 *
 * These are navigation links, not ARIA tabs: each one is a real URL that can
 * be linked, opened in a new tab and bookmarked. So it's a `<nav>` with
 * `aria-current`, not a `tablist` — claiming tab semantics here would promise
 * arrow-key cycling over panels that don't exist.
 */
export function SectionTabs({
  items,
  active,
  accent = "var(--mm-gold)",
  label = "Sections",
}: {
  items: SectionTabItem[];
  /** The href of the current section. */
  active: string;
  accent?: string;
  /** Accessible name for the rail. */
  label?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="mm-scroll -mx-1 overflow-x-auto px-1 pb-1"
    >
      <ul className="mm-glass inline-flex min-w-full gap-1 p-1 sm:min-w-0">
        {items.map((t) => {
          const isActive = t.href === active;
          const tone = t.tone === "danger" ? "var(--mm-danger)" : accent;

          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm transition ${
                  isActive
                    ? "font-medium"
                    : "text-[var(--mm-text-dim)] hover:bg-[color-mix(in_srgb,var(--mm-elevated)_70%,transparent)] hover:text-[var(--mm-text)]"
                }`}
                style={
                  isActive
                    ? {
                        background: `color-mix(in srgb, ${tone} 15%, transparent)`,
                        color: accentText(tone),
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 45%, transparent)`,
                      }
                    : undefined
                }
              >
                {t.icon && (
                  <Icon
                    icon={t.icon}
                    width={16}
                    className={
                      isActive
                        ? ""
                        : "opacity-70 transition group-hover:opacity-100"
                    }
                  />
                )}
                {t.label}

                {t.count !== undefined && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                    style={
                      isActive
                        ? {
                            background: `color-mix(in srgb, ${tone} 22%, transparent)`,
                            color: accentText(tone),
                          }
                        : {
                            background: "var(--mm-elevated)",
                            color: "var(--mm-text-dim)",
                          }
                    }
                  >
                    {t.count}
                  </span>
                )}

                {/* A lit underline under the active segment — the one cue that
                    still lands for anyone who can't separate the tint from the
                    trough behind it. */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full"
                    style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
