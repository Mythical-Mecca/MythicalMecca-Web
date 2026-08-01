"use client";

import { usePathname } from "next/navigation";

/**
 * Some routes are a single, urgent action rather than a place to browse from.
 *
 * `/q/[token]` is the screen someone lands on having just scanned a tag at a
 * stand, with a queue behind them. Sitting the claim card below the quick-
 * launch tiles and a breadcrumb pushed the actual button towards the fold on a
 * small phone, so people had to scroll before they could check in. On those
 * routes the surrounding chrome is suppressed entirely.
 */
const FOCUS_PREFIXES = ["/q/"];

export function FocusRoute({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path && FOCUS_PREFIXES.some((p) => path.startsWith(p))) return null;
  return <>{children}</>;
}
