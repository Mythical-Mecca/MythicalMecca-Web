import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * The site's unified titled card: a glass panel with an emphasized header band
 * (accent-tinted background + icon chip + display-font title + optional badge
 * and a right-aligned "view all" pill) sitting above a padded body. Used for
 * every titled content panel so cards read the same everywhere.
 */
export function Card({
  id,
  title,
  icon,
  badge,
  action,
  accent = "var(--mm-gold)",
  className = "",
  bodyClassName = "p-5",
  children,
}: {
  id?: string;
  title: string;
  icon?: string;
  badge?: React.ReactNode;
  action?: { href: string; label: string };
  /** Accent colour for the header band, icon chip, and action pill. */
  accent?: string;
  className?: string;
  /** Override the body padding (e.g. "p-3" for flush lists). */
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`mm-glass overflow-hidden ${className}`}>
      <header
        className="flex items-center justify-between gap-3 border-b px-5 py-3"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 38%, transparent)`,
          background: `color-mix(in srgb, ${accent} 10%, transparent)`,
        }}
      >
        <h2 className="flex min-w-0 items-center gap-2.5 font-[family-name:var(--font-display)] text-base tracking-wide">
          {icon && (
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{
                background: `color-mix(in srgb, ${accent} 24%, transparent)`,
                color: accent,
              }}
            >
              <Icon icon={icon} width={17} />
            </span>
          )}
          <span className="truncate">{title}</span>
          {badge}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors hover:brightness-110"
            style={{
              color: accent,
              borderColor: `color-mix(in srgb, ${accent} 50%, transparent)`,
              background: `color-mix(in srgb, ${accent} 16%, transparent)`,
            }}
          >
            {action.label}
            <Icon icon="mdi:arrow-right" width={13} />
          </Link>
        )}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/**
 * Teaching empty state: one friendly line + one action, as a flat dashed row
 * that sits inside a Card body.
 */
export function EmptyState({
  href,
  text,
  cta,
}: {
  href: string;
  text: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--mm-border)] p-4 text-sm text-[var(--mm-text-dim)] transition hover:border-[var(--mm-violet)] hover:text-[var(--mm-text)]"
    >
      <span>{text}</span>
      <span className="mm-btn mm-btn-ghost shrink-0 text-xs">{cta}</span>
    </Link>
  );
}
