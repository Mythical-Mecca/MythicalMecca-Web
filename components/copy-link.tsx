"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Shown once, right after an invite is created. With no mail provider wired up
 * this is the primary delivery channel, so it has to be impossible to miss.
 */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin, permissions) — the input below
      // still holds the full URL for a manual copy.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2 text-xs text-[var(--mm-text-dim)]"
      />
      <button type="button" onClick={copy} className="mm-btn mm-btn-primary text-sm">
        <Icon icon={copied ? "mdi:check" : "mdi:content-copy"} width={16} />
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
