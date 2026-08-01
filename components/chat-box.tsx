"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

export interface ChatBoxMessage {
  id: string;
  author: string;
  body: string;
  /** ISO timestamp; blank/invalid values simply hide the time. */
  createdAt: string;
  /** Highlights + right-aligns (chat variant) the current user's own messages. */
  mine?: boolean;
  /** Show a hover "delete" affordance (wired to onDelete). */
  canDelete?: boolean;
}

/**
 * Reusable message thread + composer. Renders neat chat bubbles in a scrollable
 * area with a footer composer whose send button is a round icon integrated into
 * the input pill. Purely presentational for the thread — data flow (polling,
 * optimistic updates, persistence) lives in the caller via `onSend`/`onDelete`.
 *
 *   variant="chat"     bubbles align right for `mine`, auto-scrolls to newest
 *   variant="comments" all bubbles left-aligned, own posts tinted
 */
export function ChatBox({
  messages,
  onSend,
  onDelete,
  variant = "chat",
  emptyText = "Nothing here yet — start the conversation.",
  placeholder = "Write a message…",
  disabled = false,
  sending = false,
  maxLength = 1000,
  className = "",
}: {
  messages: ChatBoxMessage[];
  onSend: (body: string) => void;
  onDelete?: (id: string) => void;
  variant?: "chat" | "comments";
  emptyText?: string;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const alignMineRight = variant === "chat";

  // Keep the newest message in view (chat only — comments read top-down).
  useEffect(() => {
    if (variant === "chat") {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [messages.length, variant]);

  function submit() {
    const body = draft.trim();
    if (!body || disabled || sending) return;
    setDraft("");
    onSend(body);
  }

  return (
    <div
      className={`flex flex-col ${
        variant === "chat" ? "mm-glass overflow-hidden" : ""
      } ${className}`}
    >
      <div
        ref={listRef}
        className={`mm-scroll flex flex-col gap-2.5 overflow-y-auto ${
          variant === "chat" ? "max-h-96 min-h-40 p-4" : "max-h-80"
        }`}
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--mm-text-dim)]">
            {emptyText}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                alignMineRight && m.mine ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`group max-w-[85%] rounded-2xl border bg-gradient-to-br px-3.5 py-2 text-sm ${
                  m.mine
                    ? "border-[color-mix(in_srgb,var(--mm-violet)_45%,transparent)] from-[color-mix(in_srgb,var(--mm-violet)_48%,transparent)] to-[color-mix(in_srgb,var(--mm-blue)_16%,transparent)]"
                    : "border-[var(--mm-border)] from-[color-mix(in_srgb,var(--mm-surface)_95%,transparent)] to-[color-mix(in_srgb,var(--mm-violet)_22%,transparent)]"
                }`}
              >
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-[var(--mm-gold)]">
                    {m.mine ? "You" : m.author}
                  </span>
                  <span className="text-[var(--mm-text-dim)]">
                    {fmtTime(m.createdAt)}
                  </span>
                  {m.canDelete && onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      className="ml-1 hidden text-[var(--mm-danger)] hover:underline group-hover:inline"
                      aria-label="Delete message"
                    >
                      delete
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-[var(--mm-text)]">
                  {m.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer footer — round send icon integrated into the input pill. */}
      <div className={variant === "chat" ? "p-3" : "pt-3"}>
        <div className="relative flex items-center">
          <input
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-full border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_70%,transparent)] py-2.5 pl-4 pr-12 text-sm text-[var(--mm-text)] outline-none transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mm-violet)_30%,transparent)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled || sending || draft.trim() === ""}
            className="absolute right-1.5 grid h-8 w-8 place-items-center rounded-full bg-[var(--mm-violet)] text-white transition hover:brightness-110 disabled:opacity-40"
            aria-label="Send"
          >
            <Icon icon="mdi:send" width={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
