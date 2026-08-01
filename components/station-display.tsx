"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { QrScanner } from "@/components/qr-scanner";

interface Slot {
  code: string;
  from: number;
  to: number;
  qr: string;
}

interface Feed {
  rotationSeconds: number;
  serverNow: number;
  codes: Slot[];
  recent: { name: string; at: string }[];
  total: number;
}

interface ScanResult {
  outcome: string;
  name?: string;
  points?: number;
  recent?: { name: string; at: string }[];
}

const OUTCOME_FLASH: Record<
  string,
  { icon: string; tone: string; title: (r: ScanResult) => string; sub: string }
> = {
  ok: {
    icon: "mdi:check-circle",
    tone: "var(--mm-live)",
    title: (r) => `${r.name ?? "Checked in"}`,
    sub: "Checked in",
  },
  duplicate: {
    icon: "mdi:information",
    tone: "var(--mm-gold)",
    title: (r) => `${r.name ?? "Already done"}`,
    sub: "Already checked in here",
  },
  bad_pass: {
    icon: "mdi:close-circle",
    tone: "var(--mm-danger)",
    title: () => "Pass expired",
    sub: "Ask them to refresh their pass",
  },
  // Distinct from bad_pass on purpose: telling a customer their pass expired
  // when the real problem is the venue wifi sends them off to "fix" something
  // that isn't broken, and the loop never terminates.
  offline: {
    icon: "mdi:wifi-off",
    tone: "var(--mm-gold)",
    title: () => "No connection",
    sub: "Couldn't reach the network — try again in a moment",
  },
  not_open: {
    icon: "mdi:pause-circle",
    tone: "var(--mm-gold)",
    title: () => "Quest closed",
    sub: "This quest isn't running",
  },
  unknown_step: {
    icon: "mdi:help-circle",
    tone: "var(--mm-danger)",
    title: () => "Not recognised",
    sub: "That isn't a quest pass",
  },
};

/**
 * The vendor's kiosk.
 *
 * Default mode is passive: the code sits on screen and players do the work, so
 * a vendor mid-sale needn't touch anything. One tap flips to a scanner for the
 * players who show a pass on their own phone instead.
 */
export function StationDisplay({
  stepId,
  objectiveTitle,
  questTitle,
  partnerName,
  initialRecent,
  initialTotal,
}: {
  stepId: string;
  objectiveTitle: string;
  questTitle: string;
  partnerName: string | null;
  initialRecent: { name: string; at: string }[];
  initialTotal: number;
}) {
  const [mode, setMode] = useState<"code" | "scan">("code");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState(initialRecent);
  const [total, setTotal] = useState(initialTotal);
  const [busy, setBusy] = useState(false);
  const skewRef = useRef(0);
  const fetching = useRef(false);
  // Mirrored so the ticker can check the buffer without re-subscribing on
  // every slot change.
  const slotsRef = useRef<Slot[]>([]);

  const load = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const res = await fetch(`/api/quest-station/${stepId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const feed: Feed = await res.json();
      skewRef.current = feed.serverNow - Date.now();
      slotsRef.current = feed.codes;
      setSlots(feed.codes);
      if (feed.recent) setRecent(feed.recent);
      if (typeof feed.total === "number") setTotal(feed.total);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      fetching.current = false;
    }
  }, [stepId]);

  // One ticker drives both the countdown and the buffer top-up. Refilling from
  // the callback (rather than an effect watching `now`) keeps the fetch out of
  // the render path entirely.
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => {
      const t0 = Date.now() + skewRef.current;
      setNow(t0);
      if (slotsRef.current.filter((s) => s.to > t0).length <= 1) void load();
    }, 250);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  // A station is useless if the screen sleeps mid-shift.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Unsupported or denied — the vendor can set their own screen timeout.
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  // `busy` is held in a ref, NOT in the dependency array. As state it changed
  // on every scan, which changed this callback, which changed the scanner's
  // effect identity — tearing down and reopening the camera between every
  // person in the queue. The vendor saw the viewfinder go black each time.
  const busyRef = useRef(false);
  const onScan = useCallback(
    async (value: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await fetch(`/api/quest-station/${stepId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pass: value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const result: ScanResult = await res.json();
        setFlash(result);
        if (result.recent) setRecent(result.recent);
        // Haptic confirmation matters when the screen is at arm's length.
        if (result.outcome === "ok") navigator.vibrate?.(80);
        else navigator.vibrate?.([40, 60, 40]);
      } catch {
        setFlash({ outcome: "offline" });
        navigator.vibrate?.([40, 60, 40]);
      } finally {
        busyRef.current = false;
        setBusy(false);
        // Clear the flash so the next person in the queue can be scanned.
        setTimeout(() => setFlash(null), 2200);
      }
    },
    [stepId]
  );

  const current = slots.find((s) => s.from <= now && s.to > now) ?? null;
  const secondsLeft = current
    ? Math.max(0, Math.ceil((current.to - now) / 1000))
    : 0;
  const rotation = current ? (current.to - current.from) / 1000 : 60;

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
          {questTitle}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
          {partnerName ?? objectiveTitle}
        </h1>
      </div>

      {/* Mode switch — big enough to hit without looking. */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--mm-surface)] p-1.5">
        {(["code", "scan"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-3 text-sm font-medium transition ${
              mode === m
                ? "bg-[var(--mm-gold)] text-[#070b1e]"
                : "text-[var(--mm-text-dim)]"
            }`}
          >
            <Icon
              icon={m === "code" ? "mdi:qrcode" : "mdi:camera-outline"}
              width={17}
              className="mr-1.5 inline"
            />
            {m === "code" ? "Show code" : "Scan a pass"}
          </button>
        ))}
      </div>

      {mode === "code" ? (
        <div className="mm-glass mt-4 p-6 text-center">
          {current ? (
            <>
              {/* Rounding goes on the wrapper: a rounded <img> clips the QR's
                  finder patterns and hurts read rate. */}
              <div className="mx-auto w-fit overflow-hidden rounded-2xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.qr}
                  alt="Check-in code"
                  width={260}
                  height={260}
                  className="block"
                />
              </div>
              {/* Deliberately not a live region: this changes every 60s
                  forever, and announcing four digits on a loop is hostile to
                  anyone using a screen reader. The scan confirmation is the
                  thing worth announcing, and it is. */}
              <p className="mt-5 font-[family-name:var(--font-display)] text-6xl tracking-[0.25em] tabular-nums">
                {current.code}
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--mm-surface)]">
                <div
                  className="h-full bg-[var(--mm-gold)] transition-[width] duration-300 ease-linear"
                  style={{ width: `${(secondsLeft / rotation) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
                New code in {secondsLeft}s
              </p>
            </>
          ) : offline ? (
            // The buffer has drained. Scanning is down too, so the honest
            // instruction is "wait" rather than a spinner that never resolves.
            <div className="py-12">
              <Icon
                icon="mdi:wifi-off"
                width={36}
                className="mx-auto text-[var(--mm-gold)]"
              />
              <p className="mt-3 font-medium">Can&apos;t reach the network</p>
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                Codes will come back on their own once the connection returns.
                Ask adventurers to come back in a few minutes — their progress
                is safe.
              </p>
            </div>
          ) : (
            <div className="py-16">
              <Icon
                icon="mdi:loading"
                width={36}
                className="mx-auto animate-spin text-[var(--mm-text-dim)]"
              />
              <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
                Loading codes…
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative mt-4">
          <QrScanner
            onResult={onScan}
            paused={!!flash || busy}
            label="Scan the adventurer's pass"
          />
          {flash && (
            <FlashOverlay result={flash} />
          )}
        </div>
      )}

      {offline && mode === "code" && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--mm-gold)]">
          <Icon icon="mdi:wifi-off" width={16} />
          Offline — the codes on screen are still valid.
        </p>
      )}

      <p className="mt-4 text-center text-xs text-[var(--mm-text-dim)]">
        {mode === "code"
          ? `Adventurers scan the square or type the digits. Codes change every ${Math.round(rotation)}s.`
          : "Hold their pass up to the camera. It checks them in straight away."}
      </p>

      {recent.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            <span>Adventurers today</span>
            {/* The real total — the list below is only the last handful. */}
            <span className="font-[family-name:var(--font-display)] text-base text-[var(--mm-gold)]">
              {total}
            </span>
          </h2>
          <ul className="mm-glass divide-y divide-[var(--mm-border)]">
            {recent.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span>{r.name}</span>
                <span className="text-xs text-[var(--mm-text-dim)]">
                  {new Date(r.at).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Full-bleed confirmation — readable at arm's length across a busy stand. */
function FlashOverlay({ result }: { result: ScanResult }) {
  const f = OUTCOME_FLASH[result.outcome] ?? OUTCOME_FLASH.unknown_step;
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-2xl px-6 text-center"
      style={{ background: `color-mix(in srgb, ${f.tone} 22%, #070b1e)` }}
      role="status"
      aria-live="assertive"
    >
      <div>
        <Icon icon={f.icon} width={72} style={{ color: f.tone }} className="mx-auto" />
        <p className="mt-3 font-[family-name:var(--font-display)] text-3xl">
          {f.title(result)}
        </p>
        <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
          {f.sub}
          {result.outcome === "ok" && result.points ? ` · +${result.points} pts` : ""}
        </p>
      </div>
    </div>
  );
}
