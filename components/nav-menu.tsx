"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "./icon";
import { RadiatingParticles } from "./radiating-particles";

export type NavMenuItem = {
  href: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
};

const emptySubscribe = () => () => {};

export function NavMenu({ items }: { items: NavMenuItem[] }) {
  const [open, setOpen] = useState(false);
  // True only on the client — gates the portal so SSR/hydration stays in sync.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const overlay = (
    <div
      className={`fixed inset-0 z-50 grid place-items-center p-4 ${
        open ? "" : "pointer-events-none"
      }`}
    >
        {/* backdrop — blurs the page behind the menu */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/55 backdrop-blur-lg transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* particles radiating from behind the menu */}
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[760px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          style={{
            maskImage:
              "radial-gradient(circle, #000 62%, transparent 96%)",
            WebkitMaskImage:
              "radial-gradient(circle, #000 62%, transparent 96%)",
          }}
        >
          <RadiatingParticles active={open} />
        </div>

        {/* dialog — animated rotating border, slightly transparent */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={`mm-rota relative w-full max-w-2xl rounded-[20px] p-[2px] shadow-2xl transition-all duration-300 ${
            open ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="rounded-[18px] bg-[color-mix(in_srgb,var(--mm-surface)_85%,transparent)] p-6 backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
                  Navigate
                </h2>
                <p className="text-xs text-[var(--mm-text-dim)]">
                  Where to, adventurer?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              >
                <Icon icon="mdi:close" width={20} />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{ ["--c"]: item.color } as React.CSSProperties}
                  className="group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--c)_22%,transparent)] bg-[color-mix(in_srgb,var(--c)_9%,transparent)] p-3 transition hover:border-[color-mix(in_srgb,var(--c)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--c)_18%,transparent)]"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition group-hover:scale-105"
                    style={{ background: `${item.color}22`, color: item.color }}
                  >
                    <Icon icon={item.icon} width={20} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span
                      className="block truncate text-sm font-medium"
                      style={{ color: item.color }}
                    >
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--mm-text-dim)]">
                      {item.desc}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open menu"
        className="mm-menu-trigger"
      >
        <Icon
          icon="mdi:compass-outline"
          width={20}
          className="mm-menu-trigger-icon"
        />
      </button>
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
