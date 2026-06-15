import { Icon } from "@/components/icon";

export const inputCls =
  "w-full rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-2.5 text-sm text-[var(--mm-text)] outline-none transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]";

export const textareaCls =
  "w-full rounded-2xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-3 text-sm text-[var(--mm-text)] outline-none transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wider text-[var(--mm-text-dim)]">
        {label}
        {hint && (
          <span className="normal-case tracking-normal opacity-70">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

export function FormCard({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mm-glass p-6">
      <h2 className="mb-5 flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg">
        {icon && (
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{
              background: `${accent ?? "#f2b441"}22`,
              color: accent ?? "var(--mm-gold)",
            }}
          >
            <Icon icon={icon} width={18} />
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  sub,
  icon,
  accent,
}: {
  title: string;
  sub?: string;
  icon?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <span
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{
            background: `${accent ?? "#f2b441"}22`,
            color: accent ?? "var(--mm-gold)",
          }}
        >
          <Icon icon={icon} width={24} />
        </span>
      )}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          {title}
        </h1>
        {sub && <p className="text-sm text-[var(--mm-text-dim)]">{sub}</p>}
      </div>
    </div>
  );
}
