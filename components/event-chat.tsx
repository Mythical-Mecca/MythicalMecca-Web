"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChatBox, type ChatBoxMessage } from "@/components/chat-box";
import type { ChatMessageView } from "@/lib/chat";
import { sendChatMessage } from "@/app/(app)/events/actions";
import { deleteChatMessage } from "@/app/(admin)/actions-events";

const LIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 15_000;

export function EventChat({
  scopeType,
  scopeId,
  initialMessages,
  currentUserId,
  isAdmin,
  live,
}: {
  scopeType: "event";
  scopeId: string;
  initialMessages: ChatMessageView[];
  currentUserId: string;
  isAdmin: boolean;
  live: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [pending, startTransition] = useTransition();
  const cursorRef = useRef<string | undefined>(initialMessages.at(-1)?.createdAt);

  // Incremental polling — paused while the tab is hidden (Vercel-cost lever).
  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const qs = cursorRef.current
          ? `?after=${encodeURIComponent(cursorRef.current)}`
          : "";
        const res = await fetch(`/api/chat/${scopeType}/${scopeId}${qs}`);
        if (!res.ok) return;
        const data: { messages: ChatMessageView[] } = await res.json();
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m) => !seen.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          cursorRef.current = data.messages.at(-1)!.createdAt;
        }
      } catch {
        // transient network failure — next tick retries
      }
    }

    const interval = setInterval(poll, live ? LIVE_POLL_MS : IDLE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [scopeType, scopeId, live]);

  function handleSend(body: string) {
    startTransition(async () => {
      const res = await sendChatMessage({ scopeType, scopeId, body });
      if (res.ok && res.message) {
        const msg = res.message;
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
        cursorRef.current = msg.createdAt;
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteChatMessage(id);
      if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
    });
  }

  const items: ChatBoxMessage[] = messages.map((m) => ({
    id: m.id,
    author: m.author,
    body: m.body,
    createdAt: m.createdAt,
    mine: m.userId === currentUserId,
    canDelete: isAdmin,
  }));

  return (
    <ChatBox
      messages={items}
      onSend={handleSend}
      onDelete={isAdmin ? handleDelete : undefined}
      sending={pending}
      emptyText="Quiet in here — say hello."
      placeholder="Say something…"
    />
  );
}
