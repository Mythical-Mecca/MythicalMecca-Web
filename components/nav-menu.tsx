"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "./icon";
import { trapTab } from "@/lib/focus-trap";

export type NavMenuItem = {
  href: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
};

export type NavMenuSection = {
  title: string;
  subtitle?: string;
  icon: string;
  /** Colour scheme applied to every item card in the section. */
  color: string;
  items: NavMenuItem[];
};

export type NavMenuTrigger = {
  /** Icon shown in the trigger. Defaults to the compass. */
  icon?: string;
  /** Optional visible label (e.g. "Menu" for the public bar). */
  label?: string;
  /** Override the trigger element's classes. Defaults to the golden round button. */
  className?: string;
  /** Accessible name for the trigger button. */
  ariaLabel?: string;
};

/** Matches the .mm-pop / .mm-fade transition duration in globals.css. */
const EXIT_MS = 180;

function ItemLink({
  item,
  color: sectionColor,
  onNavigate,
}: {
  item: NavMenuItem;
  /** Section fallback. An item that carries its own colour keeps it, so a
      concept is the same colour here as it is in the header and the sidebar. */
  color: string;
  onNavigate: () => void;
}) {
  const color = item.color || sectionColor;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      style={{ ["--c"]: color } as React.CSSProperties}
      className="group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--c)_9%,transparent)] bg-[color-mix(in_srgb,var(--c)_3%,transparent)] p-3 transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--c)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--c)_8%,transparent)]"
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${color}14`, color }}
      >
        <Icon icon={item.icon} width={18} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-medium" style={{ color }}>
          {item.title}
        </span>
        <span className="block truncate text-xs text-[var(--mm-text-dim)]">
          {item.desc}
        </span>
      </span>
    </Link>
  );
}

export function NavMenu({
  items,
  sections,
  trigger,
  title = "Navigate",
  subtitle = "Where to, adventurer?",
  signOutAction,
  profileHref = "/profile",
}: {
  items?: NavMenuItem[];
  sections?: NavMenuSection[];
  trigger?: NavMenuTrigger;
  title?: string;
  subtitle?: string;
  /** When provided, renders the docked footer with Profile + Sign out. */
  signOutAction?: () => void | Promise<void>;
  profileHref?: string;
}) {
  // While idle the dialog is NOT in the DOM at all — it used to sit there
  // permanently with two live backdrop-filters recompositing over the animated
  // canvases behind it, on every page.
  //
  // Opening renders it already in its final state and lets @starting-style
  // animate it in, so there's no deferred flip and the click feels instant.
  // Closing marks it `closing` (playing the exit transition) and unmounts one
  // transition later.
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setClosing(true);
        return;
      }
      if (panelRef.current) trapTab(panelRef.current, e);
    };
    document.addEventListener("keydown", onKey);

    // Lock the page behind the dialog. Compensating the removed scrollbar's
    // width stops the page from jolting sideways as it disappears.
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [open]);

  // Move focus into the dialog so Escape/Tab behave, and restore it on close.
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const returnTo = document.activeElement as HTMLElement | null;
    panelRef.current.focus({ preventScroll: true });
    return () => returnTo?.focus?.();
  }, [open]);

  const footer = signOutAction && (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--mm-border)] bg-[var(--mm-surface)] px-6 py-4">
      <Link
        href={profileHref}
        onClick={close}
        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--mm-border)] px-4 py-2.5 text-sm font-semibold text-[var(--mm-text-dim)] transition-colors hover:border-[var(--mm-gold)] hover:text-[var(--mm-text)]"
      >
        <Icon icon="game-icons:visored-helm" width={17} /> Profile
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--mm-border)] px-4 py-2.5 text-sm font-semibold text-[var(--mm-text-dim)] transition-colors hover:border-[var(--mm-danger)] hover:bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] hover:text-[var(--mm-danger)]"
        >
          <Icon icon="mdi:logout" width={17} /> Sign out
        </button>
      </form>
    </div>
  );

  const overlay = (
    <div
      className={`fixed inset-0 z-50 grid place-items-center p-4 ${
        open ? "" : "pointer-events-none"
      }`}
    >
      {/* Backdrop — a plain dim. No backdrop-filter: it sat over the animated
          canvases and was re-blurred on every one of their frames. */}
      <div
        onClick={close}
        data-closing={closing}
        className="mm-fade absolute inset-0 bg-black/60"
      />

      {/* Dialog — header and footer are docked; only the middle scrolls. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        data-closing={closing}
        className="mm-pop relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--mm-gold)_28%,transparent)] bg-[var(--mm-surface)] shadow-2xl outline-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--mm-border)] px-6 py-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {title}
            </h2>
            <p className="text-xs text-[var(--mm-text-dim)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:close" width={20} />
          </button>
        </div>

        <div className="mm-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {sections ? (
            <div className="space-y-6">
              {sections
                .filter((s) => s.items.length > 0)
                .map((section) => (
                  <section key={section.title}>
                    <div className="mb-2.5 flex items-baseline gap-2.5">
                      <span
                        className="grid h-6 w-6 shrink-0 translate-y-1 place-items-center rounded-md"
                        style={{
                          background: `${section.color}1e`,
                          color: section.color,
                        }}
                      >
                        <Icon icon={section.icon} width={14} />
                      </span>
                      <h3
                        className="text-xs font-semibold uppercase tracking-[0.18em]"
                        style={{ color: section.color }}
                      >
                        {section.title}
                      </h3>
                      {section.subtitle && (
                        <p className="truncate text-xs text-[var(--mm-text-dim)]">
                          {section.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {section.items.map((item) => (
                        <ItemLink
                          key={item.href}
                          item={item}
                          color={section.color}
                          onNavigate={close}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(items ?? []).map((item) => (
                <ItemLink
                  key={item.href}
                  item={item}
                  color={item.color}
                  onNavigate={close}
                />
              ))}
            </div>
          )}
        </div>

        {footer}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={trigger?.ariaLabel ?? "Open menu"}
        className={trigger?.className ?? "mm-menu-trigger"}
      >
        <Icon
          icon={trigger?.icon ?? "mdi:compass-outline"}
          width={20}
          className="mm-menu-trigger-icon"
        />
        {trigger?.label && <span>{trigger.label}</span>}
      </button>
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
