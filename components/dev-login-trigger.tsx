"use client";

import { useRef } from "react";

/**
 * Dev-only easter egg: 5 clicks on the wrapped element within 3 seconds signs
 * in as the local test account. Only rendered in development (see the visitor
 * layout); the real gates live server-side in the "dev-bypass" auth provider,
 * which is unregistered in production builds and rejects non-localhost hosts.
 */
export function DevLoginTrigger({ children }: { children: React.ReactNode }) {
  const clicks = useRef<number[]>([]);
  const firing = useRef(false);

  return (
    <span
      // Capture phase: runs before the inner <Link>'s click handler, so the
      // 5th click can suppress navigation (which would abort the sign-in).
      onClickCapture={(e) => {
        const now = Date.now();
        clicks.current = [
          ...clicks.current.filter((t) => now - t < 3_000),
          now,
        ];
        if (clicks.current.length >= 5 && !firing.current) {
          e.preventDefault();
          e.stopPropagation();
          clicks.current = [];
          firing.current = true;
          void (async () => {
            try {
              const { csrfToken } = await (
                await fetch("/api/auth/csrf")
              ).json();
              await fetch("/api/auth/callback/dev-bypass", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  csrfToken,
                  callbackUrl: "/auth/continue",
                }),
              });
              window.location.assign("/auth/continue");
            } catch {
              firing.current = false;
            }
          })();
        }
      }}
    >
      {children}
    </span>
  );
}
