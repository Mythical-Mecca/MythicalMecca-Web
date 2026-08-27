"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

export interface LinkChoice {
  label: string;
  href: string;
  icon?: string;
  /** Optional second line — where this goes, or why it's here. */
  hint?: string;
}

/**
 * A "where do you want to go?" menu, opened from a small icon button.
 *
 * Each destination is one row: the row itself navigates here, and the icon on
 * its right opens that same destination in a new tab. Both are offered on
 * every row deliberately — the table row you started from is a working
 * position (a filter, a sort, a scroll offset, maybe a half-finished edit),
 * and glancing at a page shouldn't cost it.
 */
export function OpenLinkDialog({
  items,
  label,
  icon = "mdi:eye-outline",
  title = "Open",
}: {
  items: LinkChoice[];
  /** What the row is — names the trigger for screen readers and titles the menu. */
  label?: string;
  icon?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Move focus in, so a screen reader lands on the dialog rather than being
    // left behind the overlay on the page underneath.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ? `Open ${label}` : "Open"}
        aria-haspopup="dialog"
        title={label ? `Open ${label}` : "Open"}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-[var(--mm-gold)]"
      >
        <Icon icon={icon} width={15} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="mm-fade fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="mm-pop w-full max-w-sm rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-bg)] p-4 outline-none"
          >
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-base tracking-wide">
                  {title}
                </h2>
                {label && (
                  <p className="mt-0.5 truncate text-xs text-[var(--mm-text-dim)]">
                    {label}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 shrink-0 rounded-lg p-1 text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              >
                <Icon icon="mdi:close" width={16} />
              </button>
            </div>

            <ul className="mt-3 space-y-1.5">
              {items.map((item) => (
                <li
                  key={item.href}
                  className="flex items-stretch gap-1.5 rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] transition focus-within:border-[var(--mm-gold)] hover:border-[var(--mm-gold)]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-l-xl px-3 py-2.5 text-left"
                  >
                    <Icon
                      icon={item.icon ?? "mdi:arrow-right"}
                      width={16}
                      className="shrink-0 text-[var(--mm-gold)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{item.label}</span>
                      {item.hint && (
                        <span className="block truncate text-xs text-[var(--mm-text-dim)]">
                          {item.hint}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* A real anchor, not `window.open`: it inherits the click as
                      a user gesture, so no popup blocker, and `noopener` keeps
                      the new tab from reaching back into this one. */}
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    // Close on the NEXT task, never this one. This anchor lives
                    // inside `{open && …}`, so closing synchronously unmounts it
                    // while the click is still being dispatched — React flushes
                    // discrete updates before the browser runs the default
                    // action. The browser is then left resolving `_blank`
                    // against an element that has no document, and the
                    // navigation falls back into this tab instead of a new one.
                    // Deferring lets the default action complete first.
                    onClick={() => {
                      setTimeout(() => setOpen(false), 0);
                    }}
                    aria-label={`${item.label} — open in new tab`}
                    title="Open in new tab"
                    className="grid w-11 shrink-0 place-items-center rounded-r-xl border-l border-[var(--mm-border)] text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-gold)]"
                  >
                    <Icon icon="mdi:open-in-new" width={16} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
