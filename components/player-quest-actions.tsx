"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { QrScanner } from "@/components/qr-scanner";

type Sheet = "scan" | "pass" | null;

/**
 * The two things an adventurer does at a stand, kept permanently within thumb
 * reach: scan what's on the counter, or show a pass for the vendor to scan.
 * Which one applies depends on how that particular stand is set up, and the
 * player shouldn't have to know or care — both are always one tap away.
 */
export function PlayerQuestActions({ questSlug }: { questSlug: string }) {
  const [sheet, setSheet] = useState<Sheet>(null);

  return (
    <>
      {/* Sticky action bar. Sits above the safe-area inset on notched phones. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-bg)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 p-3">
          <button
            type="button"
            onClick={() => setSheet("scan")}
            className="mm-btn mm-btn-primary justify-center py-4 text-base"
          >
            <Icon icon="mdi:qrcode-scan" width={20} /> Scan
          </button>
          <button
            type="button"
            onClick={() => setSheet("pass")}
            className="mm-btn mm-btn-ghost justify-center py-4 text-base"
          >
            <Icon icon="mdi:ticket-confirmation-outline" width={20} /> My pass
          </button>
        </div>
      </div>
      {/* Spacer so the bar never covers the last objective. */}
      {/* Clearance for the fixed bar above. It grows by the home-indicator
          inset on a notched phone, so the spacer has to grow with it — a flat
          h-24 left the last objective tucked behind the bar on those devices. */}
      <div
        aria-hidden
        className="h-[calc(6rem+env(safe-area-inset-bottom))]"
      />

      {sheet && (
        <Sheet onClose={() => setSheet(null)}>
          {sheet === "scan" ? <ScanSheet /> : <PassSheet questSlug={questSlug} />}
        </Sheet>
      )}
    </>
  );
}

function Sheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Move focus in, so a screen reader lands on the sheet rather than being
    // left behind the overlay on the page underneath.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    // Tapping the backdrop closes it — on a large phone the corner button is
    // the hardest thing on screen to reach one-handed.
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-[var(--mm-border)] bg-[var(--mm-bg)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-none sm:rounded-3xl"
      >
        {/* Grab handle: the universal "swipe or tap away" affordance, and a
            second big tap target for closing. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-[var(--mm-border)]"
        />
        {children}
      </div>
    </div>
  );
}

/**
 * Pull the check-in path out of whatever the camera read.
 *
 * Deliberately host-agnostic. A tag's URL is stamped with NEXT_PUBLIC_APP_URL
 * at generation time, so it can legitimately carry a different host from the
 * one the player is browsing — a stale env var, www vs non-www, a preview
 * domain, http vs https. Requiring the origins to match rejected perfectly
 * valid tags and told the player their code wasn't part of the quest.
 *
 * Matching on shape instead is safe because the token is signed: the server
 * verifies it and answers "unknown tag" if it's forged. Nothing is trusted
 * here beyond "this looks like one of ours, go and ask".
 */
export function claimPathFrom(value: string): string | null {
  const fromPath = (pathname: string, search: string): string | null => {
    const m = pathname.match(/\/q\/([^/?#]+)\/?$/);
    return m ? `/q/${m[1]}${search}` : null;
  };

  try {
    // Absolute URL — any host.
    const url = new URL(value);
    return fromPath(url.pathname, url.search);
  } catch {
    // Not absolute; fall through to a relative path.
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("/")) {
    const [pathname, search] = trimmed.split("?");
    return fromPath(pathname!, search ? `?${search}` : "");
  }
  return null;
}

function ScanSheet() {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [found, setFound] = useState(false);

  const onResult = useCallback(
    (value: string) => {
      const path = claimPathFrom(value);
      if (path) {
        // Navigation over congested hall wifi can take seconds. Without a
        // visible acknowledgement the camera just keeps running and the
        // player assumes nothing happened and re-scans.
        setFound(true);
        navigator.vibrate?.(60);
        router.push(path);
        return;
      }
      setNote("That doesn't look like a quest code. Try the code on the stand.");
    },
    [router]
  );

  if (found) {
    return (
      <div className="py-16 text-center" role="status" aria-live="assertive">
        <Icon
          icon="mdi:check-circle"
          width={56}
          className="mx-auto text-[var(--mm-live)]"
        />
        <p className="mt-4 font-[family-name:var(--font-display)] text-xl">
          Found it
        </p>
        <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
          Checking you in…
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl">
        Scan to check in
      </h2>
      <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
        Point at the code on the stand, or on the vendor&apos;s screen.
      </p>
      <QrScanner
        onResult={onResult}
        paused={found}
        label="Line the code up in the frame"
      />
      {note && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-center text-sm text-[var(--mm-gold)]"
        >
          {note}
        </p>
      )}
    </div>
  );
}

interface PassData {
  qr: string;
  secondsRemaining: number;
  name: string;
}

function PassSheet({ questSlug }: { questSlug: string }) {
  const [pass, setPass] = useState<PassData | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/quest-pass?quest=${encodeURIComponent(questSlug)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error();
      const data: PassData = await res.json();
      setPass(data);
      setLeft(data.secondsRemaining);
      setError(false);
    } catch {
      setError(true);
    }
  }, [questSlug]);

  // Load once, then tick down and refresh as the pass rolls over so what's on
  // screen is always claimable.
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          void load();
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  // The vendor needs to read this across a counter — brightness helps.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    void (async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Not supported — nothing to do.
      }
    })();
    return () => void lock?.release();
  }, []);

  return (
    <div className="text-center">
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl">
        Your check-in pass
      </h2>
      <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
        Hold this up for the vendor to scan.
      </p>

      {/* A pass we already hold stays on screen even if a refresh fails — it
          remains valid for a while yet, and blanking it mid-hold-up while the
          vendor is trying to scan is the worst possible moment to panic. */}
      {pass ? (
        <>
          {/* White plate: QR readers cope far better with a light background,
              and the app is dark. */}
          <div className="mx-auto w-fit rounded-3xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pass.qr} alt="Your check-in pass" width={240} height={240} />
          </div>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg">
            {pass.name}
          </p>
          {error ? (
            <p className="mt-1 text-xs text-[var(--mm-gold)]">
              Couldn&apos;t refresh — this code is still good for a moment.
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--mm-text-dim)]">
              Changes every {left}s. That&apos;s deliberate — it stops a
              screenshot being passed around.
            </p>
          )}
        </>
      ) : error ? (
        <p className="py-10 text-sm text-[var(--mm-danger)]">
          Couldn&apos;t load your pass. Check your connection, then close and
          reopen this panel.
        </p>
      ) : (
        <div className="py-16">
          <Icon
            icon="mdi:loading"
            width={32}
            className="mx-auto animate-spin text-[var(--mm-text-dim)]"
          />
        </div>
      )}
    </div>
  );
}
