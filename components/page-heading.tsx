import { Icon } from "@/components/icon";

/**
 * The page header. One component, every area.
 *
 * There used to be two: this one (eyebrow + large title + rule) on the member
 * pages, and a second `PageHeader` in components/form.tsx (icon chip + smaller
 * title, no eyebrow, no rule) used by all fourteen admin pages and /apply. Same
 * job, two visual languages, and which one you got depended on which area you
 * happened to be in rather than on anything about the page.
 *
 * They are merged here. The difference that was worth keeping is density, so
 * that is now an explicit `size`: browse and detail pages lead at `lg`, the
 * tool-heavy admin screens at `md`. The icon renders as a chip beside the title
 * when there is no eyebrow to carry it, which is what the admin header did.
 */
export function PageHeading({
  title,
  subtitle,
  eyebrow,
  icon,
  accent = "var(--mm-gold)",
  size = "lg",
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  icon?: string;
  /** Accent for the eyebrow and the icon chip. */
  accent?: string;
  /** `lg` for section and detail pages, `md` for dense admin screens. */
  size?: "lg" | "md";
  actions?: React.ReactNode;
}) {
  const large = size === "lg";
  // With an eyebrow the icon belongs to it; without one it becomes the chip
  // that used to sit to the left of the admin title.
  const chip = icon && !eyebrow;

  return (
    <header
      className={`flex flex-col gap-4 border-b border-[var(--mm-divider)] sm:flex-row sm:items-end sm:justify-between ${
        large ? "pb-5" : "pb-4"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {chip && (
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{
              background: `color-mix(in srgb, ${accent} 16%, transparent)`,
              color: accent,
            }}
          >
            <Icon icon={icon} width={24} />
          </span>
        )}
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
          <h1
            className={`font-[family-name:var(--font-display)] tracking-wide ${
              large ? "text-3xl md:text-4xl" : "text-2xl"
            }`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`max-w-2xl text-[var(--mm-text-dim)] ${
                large ? "mt-2 text-sm md:text-base" : "mt-1 text-sm"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
