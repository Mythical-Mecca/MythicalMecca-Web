"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Field } from "@/components/form";

export interface PickerOption {
  value: string;
  label: string;
  /** Second line — what choosing this actually means. */
  hint?: string;
  icon?: string;
}

/**
 * A list picker in a dialog, replacing the native `<select>`.
 *
 * Native selects render as the OS picker, which on Android is a cramped
 * scrolling wheel and on iOS a bottom drum — both of which truncate long
 * labels, ignore the app's styling entirely, and give an option no room to
 * explain itself. That last part mattered here: choices like "how do we know
 * they're really there?" carry a real tradeoff, and the old form could only
 * show help for the option already selected — you had to pick a thing to find
 * out what it was.
 *
 * Works uncontrolled (pass `defaultValue`, usable straight from a server
 * component) or controlled (`value` + `onValueChange`). Either way the choice
 * is mirrored into a hidden input, so plain form actions keep working with no
 * client state on the form itself.
 */
export function PickerField({
  label,
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  description,
  icon,
  hint,
  required,
  disabled,
  /** Show a filter box once the list is long enough to need one. */
  searchThreshold = 7,
}: {
  label: string;
  name: string;
  options: PickerOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  description?: string;
  icon?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  searchThreshold?: number;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = controlled ? value : internal;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  const selected = options.find((o) => o.value === current) ?? null;
  const showSearch = options.length >= searchThreshold;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  function choose(next: string) {
    if (!controlled) setInternal(next);
    onValueChange?.(next);
    close();
  }

  /** Close, clear the filter, and hand focus back to the trigger so keyboard
   *  and screen-reader users aren't dumped at the top of the document. */
  function close() {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Focus the filter if there is one, otherwise the current choice.
    const t = setTimeout(() => {
      if (searchRef.current) searchRef.current.focus();
      else
        listRef.current
          ?.querySelector<HTMLButtonElement>('[data-selected="true"]')
          ?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      clearTimeout(t);
    };
  }, [open]);

  /** Roving arrow-key movement through the options. */
  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? []
    );
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      e.key === "ArrowDown"
        ? at < 0
          ? 0
          : Math.min(at + 1, items.length - 1)
        : at <= 0
          ? 0
          : at - 1;
    items[nextIndex]?.focus();
  }

  return (
    <Field
      label={label}
      icon={icon}
      description={description}
      hint={hint}
      className="[&>span]:cursor-default"
    >
      <input type="hidden" name={name} value={current} />
      {/* `required` can't live on a hidden input (it's never focusable, so the
          browser can't report it), so emptiness is reported here instead. */}
      {required && !current && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          className="sr-only h-0 w-0"
          onChange={() => {}}
          value=""
        />
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-4 py-3 text-left text-sm transition hover:border-[var(--mm-violet)] focus:border-[var(--mm-violet)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)] disabled:opacity-50"
      >
        {selected?.icon && (
          <Icon
            icon={selected.icon}
            width={18}
            className="shrink-0 text-[var(--mm-gold)]"
          />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate ${
              selected ? "text-[var(--mm-text)]" : "text-[var(--mm-text-dim)]"
            }`}
          >
            {selected?.label ?? placeholder ?? "Choose…"}
          </span>
          {selected?.hint && (
            <span className="mt-0.5 block truncate text-xs text-[var(--mm-text-dim)]">
              {selected.hint}
            </span>
          )}
        </span>
        <Icon
          icon="mdi:unfold-more-horizontal"
          width={18}
          className="shrink-0 text-[var(--mm-text-dim)]"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-[var(--mm-border)] bg-[var(--mm-bg)] pb-[env(safe-area-inset-bottom)] sm:max-h-[70vh] sm:rounded-3xl"
          >
            <div className="shrink-0 border-b border-[var(--mm-border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2
                  id={titleId}
                  className="font-[family-name:var(--font-display)] text-lg"
                >
                  {label}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--mm-text-dim)] hover:bg-[var(--mm-surface)] hover:text-[var(--mm-text)]"
                >
                  <Icon icon="mdi:close" width={22} />
                </button>
              </div>
              {showSearch && (
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onListKeyDown}
                  placeholder="Search…"
                  aria-label={`Search ${label}`}
                  className="mt-3 w-full rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
                />
              )}
            </div>

            <div
              ref={listRef}
              role="listbox"
              aria-label={label}
              onKeyDown={onListKeyDown}
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              {placeholder && !required && (
                <OptionRow
                  option={{ value: "", label: placeholder }}
                  selected={!current}
                  muted
                  onSelect={() => choose("")}
                />
              )}
              {visible.map((o) => (
                <OptionRow
                  key={o.value}
                  option={o}
                  selected={o.value === current}
                  onSelect={() => choose(o.value)}
                />
              ))}
              {visible.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[var(--mm-text-dim)]">
                  Nothing matches &ldquo;{query}&rdquo;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Field>
  );
}

function OptionRow({
  option,
  selected,
  muted,
  onSelect,
}: {
  option: PickerOption;
  selected: boolean;
  muted?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-selected={selected}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_45%,transparent)] ${
        selected
          ? "bg-[color-mix(in_srgb,var(--mm-gold)_14%,transparent)]"
          : "hover:bg-[var(--mm-surface)]"
      }`}
    >
      {option.icon && (
        <Icon
          icon={option.icon}
          width={20}
          className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
        />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm ${
            muted ? "text-[var(--mm-text-dim)]" : "text-[var(--mm-text)]"
          }`}
        >
          {option.label}
        </span>
        {option.hint && (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--mm-text-dim)]">
            {option.hint}
          </span>
        )}
      </span>
      {selected && (
        <Icon
          icon="mdi:check"
          width={20}
          className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
        />
      )}
    </button>
  );
}
