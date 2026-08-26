"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { trapTab } from "@/lib/focus-trap";

/** Matches the .mm-pop / .mm-fade transition duration in globals.css. */
const EXIT_MS = 180;

/**
 * The house modal.
 *
 * Every dialog on the site had been hand-rolled — the nav menu, the admin side
 * sheet, the confirm dialog, the calendar day sheet — and each one had a
 * different subset of the behaviour a modal owes you. This is that behaviour in
 * one place: absent from the DOM while closed (so nothing inside it is ever in
 * the tab order), mounted straight into its final state so `@starting-style`
 * animates the entrance, held for one transition on the way out, Escape to
 * close, Tab contained, page scroll locked, focus moved in and handed back to
 * whatever opened it.
 *
 * Renders nothing but the dialog — the trigger is yours, so a caller can use a
 * button, a card, a "+" on a timeline, whatever fits.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  accent = "var(--mm-gold)",
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
  /** `md` for forms, `sm` for confirmations, `xl` for a full-size image. */
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount/unmount tracks the caller's `open`, but the node has to outlive it by
  // one transition so the exit can play. Adjusted during render rather than in
  // an effect — this is derived state, and doing it in an effect would mount
  // the panel a frame late (losing the @starting-style entrance) as well as
  // costing a cascading render.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }

  // The exit timer is a genuine external system, and its setState happens in
  // the timeout callback rather than synchronously in the effect body.
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const returnTo = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      trapTab(panel, e);
    };
    document.addEventListener("keydown", onKey);

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
  }, [open, mounted, onClose]);

  if (!mounted) return null;

  const width =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-xl";

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4">
      <div
        onClick={onClose}
        data-closing={closing}
        className="mm-fade absolute inset-0 bg-black/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-closing={closing}
        className={`mm-pop relative flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-3xl border bg-[var(--mm-surface)] shadow-2xl outline-none sm:max-h-[88dvh] sm:rounded-3xl`}
        style={{
          borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--mm-divider)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                  color: accent,
                }}
              >
                <Icon icon={icon} width={19} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-[family-name:var(--font-display)] text-lg leading-tight tracking-wide">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 text-xs text-[var(--mm-text-dim)]">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:close" width={20} />
          </button>
        </header>

        <div className="mm-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
