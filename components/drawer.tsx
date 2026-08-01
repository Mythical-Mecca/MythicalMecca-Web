"use client";

import { useState } from "react";
import { Icon } from "./icon";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mm-btn mm-btn-primary text-sm"
      >
        {triggerIcon && <Icon icon={triggerIcon} width={16} />} {triggerLabel}
      </button>

      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-[var(--mm-border)] bg-[var(--mm-surface)] shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--mm-border)] p-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              aria-label="Close"
            >
              <Icon icon="mdi:close" width={20} />
            </button>
          </div>
          <div className="mm-scroll flex-1 overflow-y-auto p-5">{children}</div>
        </aside>
      </div>
    </>
  );
}
