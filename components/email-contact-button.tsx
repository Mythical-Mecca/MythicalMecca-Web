"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function EmailContactButton({
  className = "",
  label = "Email us directly",
  showAddress = false,
}: {
  className?: string;
  label?: string;
  showAddress?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const email = "information@mythical-mecca.com";

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const gmailCompose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    email
  )}&su=${encodeURIComponent("Inquiry via Mythical Mecca")}`;

  const outlookCompose = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(
    email
  )}&subject=${encodeURIComponent("Inquiry via Mythical Mecca")}`;

  const nativeMailto = `mailto:${email}?subject=${encodeURIComponent(
    "Inquiry via Mythical Mecca"
  )}`;

  return (
    <div className="relative inline-block w-full">
      <div className="flex w-full items-stretch rounded-xl border border-[var(--mm-border)] bg-[var(--mm-elevated)] p-1 transition hover:border-[var(--mm-gold)]">
        <a
          href={nativeMailto}
          onClick={(e) => {
            // Attempt native mailto and copy at the same time
            navigator.clipboard?.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          }}
          className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white transition hover:text-[var(--mm-gold)] ${className}`}
        >
          <Icon icon="mdi:email-outline" width={18} className="shrink-0 text-[var(--mm-gold)]" />
          <span className="truncate">{showAddress ? email : label}</span>
        </a>

        {/* Quick Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy email address"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--mm-text-dim)] hover:bg-[color-mix(in_srgb,var(--mm-surface)_80%,transparent)] hover:text-white transition"
        >
          <Icon
            icon={copied ? "mdi:check" : "mdi:content-copy"}
            width={16}
            className={copied ? "text-[var(--mm-live)]" : ""}
          />
        </button>

        {/* Provider dropdown button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title="More ways to email"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-l border-[var(--mm-divider)] text-[var(--mm-text-dim)] hover:bg-[color-mix(in_srgb,var(--mm-surface)_80%,transparent)] hover:text-white transition"
        >
          <Icon icon="mdi:chevron-down" width={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Copy banner */}
      {copied && (
        <div className="absolute left-0 top-full z-50 mt-1.5 flex items-center gap-1.5 rounded-lg bg-[var(--mm-live)] px-3 py-1 text-xs font-semibold text-black shadow-lg">
          <Icon icon="mdi:check-circle" width={14} />
          <span>Copied {email} to clipboard!</span>
        </div>
      )}

      {/* Options Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[240px] rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-2 shadow-2xl backdrop-blur-xl">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--mm-text-dim)]">
            Send message to:
          </div>
          <div className="space-y-1">
            <a
              href={gmailCompose}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--mm-text)] hover:bg-[var(--mm-elevated)] transition"
            >
              <Icon icon="logos:google-gmail" width={16} />
              <span>Open in Gmail (Web)</span>
            </a>
            <a
              href={outlookCompose}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--mm-text)] hover:bg-[var(--mm-elevated)] transition"
            >
              <Icon icon="logos:microsoft-outlook" width={16} />
              <span>Open in Outlook (Web)</span>
            </a>
            <a
              href={nativeMailto}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--mm-text)] hover:bg-[var(--mm-elevated)] transition"
            >
              <Icon icon="mdi:email-fast-outline" width={16} />
              <span>Open Default Mail App</span>
            </a>
            <button
              type="button"
              onClick={(e) => {
                handleCopy(e);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--mm-gold)] hover:bg-[var(--mm-elevated)] transition"
            >
              <Icon icon="mdi:content-copy" width={16} />
              <span>Copy address to clipboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
