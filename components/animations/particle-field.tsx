"use client";

import { useEffect, useRef } from "react";
import { runAmbientLoop } from "./ambient-loop";

type P = { x: number; y: number; vx: number; vy: number };

// Drift is authored against a 60fps baseline; each frame advances by however
// much wall-clock time it represents, so changing `fps` changes the cost but
// NOT the apparent speed.
const BASE_FPS = 60;
const SPEED_AT_60 = 1;

/**
 * Lightweight connected-dots field rendered on a canvas. No dependencies.
 * Honors prefers-reduced-motion (renders a static frame).
 */
export function ParticleField({
  className,
  color,
  fps = 30,
  /** See AuroraField — ambient backdrops don't need HiDPI backing stores. */
  maxDpr = 1.5,
  /** Cap on ember count. The link pass is O(n²), so this bounds the frame cost. */
  maxPoints = 60,
}: {
  className?: string;
  /** "r, g, b" tuple. Defaults to gold motes with blue threads. */
  color?: string;
  fps?: number;
  maxDpr?: number;
  maxPoints?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dotColor = color ? `rgba(${color}, 0.85)` : "rgba(225, 141, 1, 0.8)";
    const lineRGB = color ?? "74, 168, 255";
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const SPEED = SPEED_AT_60 * (BASE_FPS / fps);

    let w = 0;
    let h = 0;
    let points: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(maxPoints, Math.floor((w * h) / 16000));
      // Embers drift gently upward with a little lateral sway.
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: SPEED * ((Math.random() - 0.5) * 0.15),
        vy: SPEED * (-0.1 - Math.random() * 0.25),
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of points) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          // recycle embers from the bottom once they drift off the top
          if (p.y < -6) {
            p.y = h + 6;
            p.x = Math.random() * w;
          }
          if (p.x < -6) p.x = w + 6;
          if (p.x > w + 6) p.x = -6;
        }
      }
      // Faint warm threads between nearby embers. Alphas are quantised into a
      // few buckets so all segments of a bucket stroke as ONE path — a handful
      // of stroke() calls per frame instead of hundreds. Distances compare
      // squared (no sqrt per pair).
      const MAX = 110;
      const MAX_SQ = MAX * MAX;
      const BUCKETS = 4;
      const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < MAX_SQ) {
            const near = 1 - Math.sqrt(distSq) / MAX; // 0..1, closer = brighter
            const bucket = Math.min(BUCKETS - 1, Math.floor(near * BUCKETS));
            paths[bucket].moveTo(a.x, a.y);
            paths[bucket].lineTo(b.x, b.y);
          }
        }
      }
      ctx.lineWidth = 1;
      for (let bkt = 0; bkt < BUCKETS; bkt++) {
        const alpha = 0.12 * ((bkt + 0.5) / BUCKETS);
        ctx.strokeStyle = `rgba(${lineRGB}, ${alpha})`;
        ctx.stroke(paths[bkt]);
      }

      // embers, batched into a single fill
      const dots = new Path2D();
      for (const p of points) {
        dots.moveTo(p.x + 1.5, p.y);
        dots.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      }
      ctx.fillStyle = dotColor;
      ctx.fill(dots);
    };

    resize();
    const stop = runAmbientLoop(canvas, draw, { fps, loop: !reduce });
    window.addEventListener("resize", resize);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
    };
  }, [color, fps, maxDpr, maxPoints]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
