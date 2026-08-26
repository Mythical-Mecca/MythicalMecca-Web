"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Route-level loading and error UI.
 *
 * The app had neither, across all 34 routes. Every navigation is a server
 * round trip, so clicking a section produced no feedback whatsoever until the
 * next page painted — on a slow connection the site simply looked frozen — and
 * any thrown error fell through to Next's default screen, which is unstyled and
 * drops the reader out of the product entirely.
 */

/** Skeleton shown while a route's server component resolves. */
export function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="animate-pulse space-y-5"
    >
      <span className="sr-only">Loading…</span>
      <div className="space-y-3 border-b border-[var(--mm-divider)] pb-5">
        <div className="h-3 w-32 rounded-full bg-[var(--mm-elevated)]" />
        <div className="h-9 w-2/3 max-w-md rounded-lg bg-[var(--mm-elevated)]" />
        <div className="h-3 w-full max-w-xl rounded-full bg-[var(--mm-surface)]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="mm-glass h-56 lg:col-span-2" />
        <div className="mm-glass h-56" />
      </div>
    </div>
  );
}

/**
 * Route error boundary body. `reset` re-runs the segment, which is the right
 * first move for the transient failures this mostly catches (a cold database
 * connection, a dropped fetch).
 */
export function RouteError({
  error,
  reset,
  area = "/dashboard",
  areaLabel = "Back to your dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  area?: string;
  areaLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mm-glass mx-auto max-w-lg p-8 text-center">
      <Icon
        icon="game-icons:broken-shield"
        width={40}
        className="mx-auto text-[var(--mm-danger)]"
      />
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Something went sideways
      </h1>
      <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
        This page didn&apos;t load. It&apos;s usually a passing thing — try it
        again, and if it keeps happening let us know on Discord.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-[var(--mm-text-dim)]">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="mm-btn mm-btn-primary">
          <Icon icon="mdi:refresh" width={17} /> Try again
        </button>
        <Link href={area} className="mm-btn mm-btn-ghost">
          {areaLabel}
        </Link>
      </div>
    </div>
  );
}
