"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { trapTab } from "@/lib/focus-trap";

/**
 * A submit button that asks first.
 *
 * Rendered inside the form it submits, so the confirm control is a real
 * `type="submit"` — the action still runs as a normal form post, and the
 * dialog is purely a gate in front of it. `window.confirm` would do the same
 * job, but it can't show what is about to cascade, and browsers increasingly
 * suppress it.
 */
export function ConfirmButton({
  label,
  confirmLabel = "Yes, do it",
  title,
  body,
  icon = "mdi:alert-outline",
  className = "mm-btn mm-btn-ghost text-sm",
  tone = "danger",
}: {
  label: string;
  confirmLabel?: string;
  title: string;
  body?: React.ReactNode;
  icon?: string;
  className?: string;
  tone?: "danger" | "normal";
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const accent = tone === "danger" ? "var(--mm-danger)" : "var(--mm-gold)";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (panelRef.current) trapTab(panelRef.current, e);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Icon icon={icon} width={16} />
        {label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="mm-fade fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        >
          <div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="mm-pop w-full max-w-sm rounded-2xl border p-5 outline-none"
            style={{ borderColor: accent, background: "var(--mm-bg)" }}
          >
            <h2
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base"
              style={{ color: accent }}
            >
              <Icon icon={icon} width={18} />
              {title}
            </h2>
            {body && (
              <div className="mt-2 text-sm text-[var(--mm-text-dim)]">{body}</div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mm-btn mm-btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={() => setOpen(false)}
                className="mm-btn text-sm"
                style={{ background: accent, color: "#160f0a" }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
