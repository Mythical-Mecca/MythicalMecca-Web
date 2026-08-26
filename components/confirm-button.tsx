"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { trapTab } from "@/lib/focus-trap";

/**
 * A submit button that asks first.
 *
 * The trigger sits inside the form it submits; the dialog itself is portaled
 * to <body> and submits that form by hand.
 *
 * Both halves matter. Rendered in place, the `fixed inset-0` backdrop is
 * positioned against the nearest transformed ancestor rather than the viewport
 * — and `.mm-pop`, which every dialog panel uses for its entrance, sets a
 * transform. Inside <Modal> that meant this dialog was laid out within the
 * modal panel and clipped by its `overflow-hidden`: scroll the form down and
 * the confirmation appeared off-view, so "Delete objective" looked dead.
 *
 * Portaling fixes the positioning but breaks `type="submit"`, since form
 * ownership follows the DOM, not the React tree. So the confirm control calls
 * `requestSubmit()` on the form the trigger belongs to, which still runs the
 * action as a normal submit. `window.confirm` would do the same
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const accent = tone === "danger" ? "var(--mm-danger)" : "var(--mm-gold)";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Stop here: this dialog may sit inside a <Modal>, which also closes on
        // Escape — one press should dismiss the confirmation, not both.
        e.stopPropagation();
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

  /**
   * The dialog lives in a portal, so the confirm control is no longer a DOM
   * descendant of the form and `type="submit"` would submit nothing. Form
   * ownership is read off the trigger, which *is* inside it.
   */
  const confirm = () => {
    const form = triggerRef.current?.form;
    setOpen(false);
    form?.requestSubmit();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Icon icon={icon} width={16} />
        {label}
      </button>

      {open &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            className="mm-fade fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4"
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
                type="button"
                onClick={confirm}
                className="mm-btn text-sm"
                style={{ background: accent, color: "#160f0a" }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
