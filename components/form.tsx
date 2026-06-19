import { Icon } from "@/components/icon";

export const inputCls =
  "w-full rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-2.5 text-sm text-[var(--mm-text)] outline-none transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]";

export const textareaCls =
  "w-full rounded-2xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-3 text-sm text-[var(--mm-text)] outline-none transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]";

/** Label shell: icon + title + optional hint + description, then the control. */
export function Field({
  label,
  hint,
  icon,
  description,
  className,
  children,
}: {
  label: string;
  hint?: string;
  icon?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-[var(--mm-text)]">
        {icon && <Icon icon={icon} width={16} className="text-[var(--mm-gold)]" />}
        {label}
        {hint && (
          <span className="ml-auto text-xs font-normal text-[var(--mm-text-dim)]">
            {hint}
          </span>
        )}
      </span>
      {description && (
        <span className="mt-0.5 block text-xs text-[var(--mm-text-dim)]">
          {description}
        </span>
      )}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

type BaseField = {
  label: string;
  icon?: string;
  description?: string;
  hint?: string;
  className?: string;
};

export function TextField({
  label,
  icon,
  description,
  hint,
  className,
  ...rest
}: BaseField & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} icon={icon} description={description} hint={hint} className={className}>
      <input {...rest} className={inputCls} />
    </Field>
  );
}

export function TextareaField({
  label,
  icon,
  description,
  hint,
  className,
  ...rest
}: BaseField & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} icon={icon} description={description} hint={hint} className={className}>
      <textarea {...rest} className={textareaCls} />
    </Field>
  );
}

export function CheckboxField({
  label,
  icon,
  description,
  className,
  ...rest
}: Omit<BaseField, "hint"> & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-3 transition hover:border-[var(--mm-violet)] ${className ?? ""}`}
    >
      <input
        type="checkbox"
        {...rest}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--mm-gold)]"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--mm-text)]">
          {icon && <Icon icon={icon} width={16} className="text-[var(--mm-gold)]" />}
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--mm-text-dim)]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function SelectField({
  label,
  icon,
  description,
  hint,
  className,
  options,
  placeholder,
  ...rest
}: BaseField & {
  options: { value: string; label: string }[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} icon={icon} description={description} hint={hint} className={className}>
      <select {...rest} className={inputCls}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
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
  action,
}: {
  title: string;
  sub?: string;
  icon?: string;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
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
      {action}
    </div>
  );
}

/** Form section divider with a title. */
export function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--mm-text-dim)]">
        {icon && <Icon icon={icon} width={15} />}
        {title}
      </div>
      {children}
    </div>
  );
}
