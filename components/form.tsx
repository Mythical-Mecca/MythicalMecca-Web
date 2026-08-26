import { Icon } from "@/components/icon";

export const inputCls =
  "w-full rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-2.5 text-sm text-[var(--mm-text)] transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]";

export const textareaCls =
  "w-full rounded-2xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-3 text-sm text-[var(--mm-text)] transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]";

/** Applied on top of the input classes when a field is carrying an error. */
export const invalidCls =
  "!border-[var(--mm-danger)] focus:!ring-[color-mix(in_srgb,var(--mm-danger)_35%,transparent)]";

// Pill-shaped single-line input (chat, comments, inline forms). Prefix with a
// width utility at the call site, e.g. `w-full ${inputPill}` or `flex-1 …`.
export const inputPill =
  "rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm text-[var(--mm-text)] transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)]";

/**
 * Turn a label into a stable id, so a control and its error message can be
 * wired together without a hook (this file is a server component).
 */
function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Label shell: icon + title + optional hint, the control, then description and error. */
export function Field({
  label,
  hint,
  icon,
  description,
  className,
  error,
  errorId,
  descriptionId,
  required,
  children,
}: {
  label: string;
  hint?: string;
  icon?: string;
  description?: string;
  className?: string;
  /** Validation message. Renders below the control and marks it invalid. */
  error?: string | null;
  /** Id given to the error text, so the control can point at it. */
  errorId?: string;
  /** Id given to the description, so the control can point at it. */
  descriptionId?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-[var(--mm-text)]">
        {icon && <Icon icon={icon} width={16} className="text-[var(--mm-gold)]" />}
        {label}
        {required && (
          <span
            aria-hidden
            title="Required"
            className="text-[var(--mm-gold)]"
          >
            *
          </span>
        )}
        {hint && (
          <span className="ml-auto text-xs font-normal text-[var(--mm-text-dim)]">
            {hint}
          </span>
        )}
      </span>
      <span className="mt-2 block">{children}</span>
      {/* Help text sits under the control, not between the label and it.
          Above, it pushed the input away from its own label and made the
          reader scan past a sentence before reaching the thing they came to
          type in — worst on a long note like the slug warning. Below, the
          label-then-control pairing stays tight and the note reads as a
          footnote to the field. */}
      {description && (
        <span
          id={descriptionId}
          className="mt-1.5 block text-xs text-[var(--mm-text-dim)]"
        >
          {description}
        </span>
      )}
      {/* The form system had no error slot at all and `aria-invalid` appeared
          nowhere in the codebase, so a rejected field could only be described
          in prose somewhere else on the page. role="alert" so it is announced
          when it appears after a failed submit. */}
      {error && (
        <span
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--mm-danger)]"
        >
          <Icon icon="mdi:alert-circle-outline" width={13} className="shrink-0" />
          {error}
        </span>
      )}
    </label>
  );
}

type BaseField = {
  label: string;
  icon?: string;
  description?: string;
  hint?: string;
  className?: string;
  /** Validation message for this field. */
  error?: string | null;
};

export function TextField({
  label,
  icon,
  description,
  hint,
  className,
  error,
  ...rest
}: BaseField & React.InputHTMLAttributes<HTMLInputElement>) {
  const base = rest.id ?? rest.name ?? slugId(label);
  const errorId = `${base}-error`;
  const descriptionId = `${base}-description`;
  // The description now follows the control, so it no longer gets read on the
  // way in — it has to be pointed at explicitly.
  const describedBy =
    [error ? errorId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || rest["aria-describedby"];
  return (
    <Field
      label={label}
      icon={icon}
      description={description}
      descriptionId={descriptionId}
      hint={hint}
      className={className}
      error={error}
      errorId={errorId}
      required={rest.required}
    >
      <input
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputCls} ${error ? invalidCls : ""}`}
      />
    </Field>
  );
}

export function TextareaField({
  label,
  icon,
  description,
  hint,
  className,
  error,
  ...rest
}: BaseField & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const base = rest.id ?? rest.name ?? slugId(label);
  const errorId = `${base}-error`;
  const descriptionId = `${base}-description`;
  const describedBy =
    [error ? errorId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || rest["aria-describedby"];
  return (
    <Field
      label={label}
      icon={icon}
      description={description}
      descriptionId={descriptionId}
      hint={hint}
      className={className}
      error={error}
      errorId={errorId}
      required={rest.required}
    >
      <textarea
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${textareaCls} ${error ? invalidCls : ""}`}
      />
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
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--mm-gold)]"
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

// Choosing from a list is handled by `PickerField` (components/picker-field.tsx),
// not a native <select> — see the note there for why.

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
              background: `${accent ?? "#E18D01"}22`,
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

// The page header lives in components/page-heading.tsx. This file used to
// carry a second one; see the note there for why they were merged.

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
