"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";

/**
 * Routes that are a task rather than a place to browse from.
 *
 * `/q/[token]` is the screen someone lands on having just scanned a tag at a
 * stand, with a queue behind them. `/quests/[slug]` is the quest itself — the
 * page a player keeps open while walking a venue. Both carry their own header,
 * their own way back and, on the quest, a fixed action bar; stacking the app
 * nav, a breadcrumb trail and the section links on top of that is three rows of
 * chrome above content that is already self-contained, and on a phone it pushes
 * the first objective towards the fold.
 *
 * The quest *board* (`/quests`) is a browsing page and keeps the full shell —
 * only a specific quest goes bare, which is why the prefix has a trailing
 * slash.
 */
const FOCUS_PREFIXES = ["/q/", "/quests/"];

function isFocusRoute(path: string | null): boolean {
  return !!path && FOCUS_PREFIXES.some((p) => path.startsWith(p));
}

/**
 * The member-area frame. Takes the header as a prop rather than rendering it,
 * so the server can build it (it closes over a sign-out server action) while
 * this decides whether it belongs on screen.
 */
export function AppShell({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const focused = isFocusRoute(usePathname());

  return (
    <div className="flex min-h-full flex-col">
      <a href="#main-content" className="mm-skip">
        Skip to content
      </a>
      {!focused && nav}
      <main
        id="main-content"
        tabIndex={-1}
        // Focus routes size themselves. Keeping the shell's max-width and
        // padding here would double up on the page's own container.
        className={
          focused
            ? "flex-1"
            : "mx-auto w-full max-w-6xl flex-1 px-6 py-6"
        }
      >
        {/* Two nav layers, not four. The header carries the sections; this
            carries where you are inside one. */}
        {!focused && (
          <div className="mb-5 empty:hidden">
            <Breadcrumbs />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
