"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icon";
import { trapTab } from "@/lib/focus-trap";

/** Matches the .mm-sheet / .mm-fade transition duration in globals.css. */
const EXIT_MS = 240;

/**
 * Right-hand side sheet for the admin "New …" forms.
 *
 * It used to stay mounted permanently and hide by translating off-screen. That
 * left its whole form — 22 focusable controls on the events screen — sitting in
 * the tab order and in the accessibility tree of every page that rendered one:
 * tab past the last visible control and you landed in an invisible form, and a
 * screen reader read the thing out as page content. It also had no Escape, no
 * focus containment, no scroll lock and no dialog semantics, none of which
 * matched `NavMenu` two files over.
 *
 * So it now follows exactly the `NavMenu` contract: absent from the DOM while
 * closed, mounted straight into its final state so `@starting-style` animates
 * the entrance with no deferred flip, and held for one transition on the way
 * out. Focus moves in on open, is trapped for as long as it is open, and
 * returns to the trigger on close.
 */
export function Drawer({
  title,
  triggerLabel,
  triggerIcon,
  children,
}: {
  title: string;
  triggerLabel: string;
  triggerIcon?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = mounted && !closing;

  const show = () => {
    setClosing(false);
    setMounted(true);
  };
  const close = () => setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    // Captured now: by cleanup time the ref may already point elsewhere, and
    // this is the element focus has to go back to.
    const returnTo = triggerRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setClosing(true);
        return;
      }
      // Focus containment. A sheet this size covers the screen on a phone and
      // sits over a dimmed page on a desktop; tabbing out to controls the
      // reader cannot see is the same bug as before, just with the sheet open.
      trapTab(panel, e);
    };
    document.addEventListener("keydown", onKey);

    // Lock the page behind the sheet, compensating for the scrollbar so the
    // layout doesn't jolt sideways as it disappears.
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    panel.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      returnTo?.focus?.();
    };
  }, [open]);

  const overlay = (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        onClick={close}
        data-closing={closing}
        className="mm-fade absolute inset-0 bg-black/60"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-closing={closing}
        className="mm-sheet absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-[var(--mm-border)] bg-[var(--mm-surface)] shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-[var(--mm-divider)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid h-11 w-11 place-items-center rounded-lg text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            aria-label={`Close ${title}`}
          >
            <Icon icon="mdi:close" width={20} />
          </button>
        </div>
        <div className="mm-scroll flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        // h-11 to match the search field and options button it sits beside in
        // the table toolbar; .mm-btn's 44px floor alone left it 4px short.
        className="mm-btn mm-btn-primary h-11 shrink-0 text-sm"
      >
        {triggerIcon && <Icon icon={triggerIcon} width={16} />} {triggerLabel}
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
