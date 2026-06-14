"use client";

import { useRef, useState } from "react";
import { submitScore } from "@/app/(app)/arcade/actions";

type Phase = "idle" | "waiting" | "go" | "result" | "tooSoon";

export function ReactionGame({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState(0);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    setPhase("waiting");
    const delay = 1200 + Math.random() * 2600;
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase("go");
    }, delay);
  }

  function click() {
    if (phase === "idle" || phase === "result" || phase === "tooSoon") {
      start();
    } else if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("tooSoon");
    } else if (phase === "go") {
      setMs(Math.round(performance.now() - startRef.current));
      setPhase("result");
    }
  }

  const bg =
    phase === "go"
      ? "rgba(52,211,153,0.25)"
      : phase === "waiting"
        ? "rgba(244,87,123,0.18)"
        : "var(--mm-surface)";

  const label =
    phase === "idle"
      ? "Tap to start"
      : phase === "waiting"
        ? "Wait for green…"
        : phase === "go"
          ? "FIRE!"
          : phase === "tooSoon"
            ? "Too soon — tap to retry"
            : `${ms} ms — tap to retry`;

  return (
    <div className="space-y-4">
      <button
        onClick={click}
        className="flex h-56 w-full items-center justify-center rounded-2xl border border-[var(--mm-border)] text-2xl font-[family-name:var(--font-display)] tracking-widest transition-colors"
        style={{ background: bg }}
      >
        {label}
      </button>

      {phase === "result" && (
        <form action={submitScore} className="flex items-center gap-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="score" value={ms} />
          <span className="text-sm text-[var(--mm-text-dim)]">
            Reaction: <span className="text-[var(--mm-gold)]">{ms} ms</span>
          </span>
          <button className="mm-btn mm-btn-primary text-sm">
            Submit to leaderboard
          </button>
        </form>
      )}
    </div>
  );
}
