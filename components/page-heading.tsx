import { Icon } from "@/components/icon";

/**
 * Standard page header: a compact, left-aligned eyebrow + title + subtitle with
 * an optional actions cluster, separated from the content by a thin rule. Used
 * on every member page (index pages via <SectionHero>, detail/bespoke pages
 * directly) so titles read consistently beneath the layout's icon launcher.
 */
export function PageHeading({
  title,
  subtitle,
  eyebrow,
  icon,
  accent = "var(--mm-gold)",
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  icon?: string;
  /** Accent for the eyebrow. */
  accent?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--mm-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {icon && <Icon icon={icon} width={15} />}
            {eyebrow}
          </p>
        )}
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-[var(--mm-text-dim)] md:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
