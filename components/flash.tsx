import { Icon } from "@/components/icon";

const TONES = {
  success: { color: "var(--mm-live)", icon: "mdi:check-circle-outline" },
  error: { color: "var(--mm-danger)", icon: "mdi:alert-circle-outline" },
  info: { color: "var(--mm-gold)", icon: "mdi:information-outline" },
} as const;

/**
 * Inline success / error / info banner. Replaces the hand-rolled
 * `mm-glass border-[live|danger] p-3 text-sm` blocks scattered across pages.
 */
export function Flash({
  tone = "success",
  icon = true,
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  /** Show the leading status icon (default true). */
  icon?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mm-glass flex items-center gap-2 p-3 text-sm ${className ?? ""}`}
      style={{ borderColor: t.color, color: t.color }}
    >
      {icon && <Icon icon={t.icon} width={16} className="shrink-0" />}
      {children}
    </div>
  );
}
