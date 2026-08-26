import { Icon } from "@/components/icon";
import { accentText } from "@/lib/accents";

/**
 * The one true status/label pill.
 *
 * - default: soft tint of `color` (16%) with the colour as text — quiet,
 *   doesn't compete with card content. Omit `color` for a neutral pill.
 * - `solid`: filled colour with dark ink — reserved for things that SHOULD
 *   grab attention (notification counts).
 * - `dot`: leading pulsing live-dot.
 *
 * Interactive chips (tabs, link pills, steppers) are NOT badges — don't use
 * this for them.
 */
export function Badge({
  color,
  icon,
  solid = false,
  dot = false,
  title,
  className,
  children,
}: {
  /** Any CSS colour (hex or var(--…)). Omit for a neutral pill. */
  color?: string;
  /** Iconify icon name rendered before the label. */
  icon?: string;
  solid?: boolean;
  dot?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const style = color
    ? solid
      ? { background: color, color: "#10141f" }
      : {
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
          // Not the raw accent: on its own 16% wash the darker accents land
          // between 3.4 and 3.9:1. See `accentText`.
          color: accentText(color),
        }
    : undefined;

  return (
    <span
      title={title}
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
        color ? "" : "bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]"
      } ${className ?? ""}`}
    >
      {dot && <span className="mm-dot-live shrink-0" />}
      {icon && <Icon icon={icon} width={12} />}
      {children}
    </span>
  );
}
