"use client";

import { useEffect, useRef } from "react";

type Mote = { x: number; y: number; vy: number; vx: number; c: number; r: number };

// green, purple, teal — matched to the aurora art
const COLORS: [number, number, number][] = [
  [78, 214, 142],
  [150, 104, 255],
  [72, 200, 214],
];

/**
 * Flowing aurora curtains (green / purple / teal) plus drifting motes.
 * Canvas-based, additive blending, honors prefers-reduced-motion.
 */
export function AuroraField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;
    let motes: Mote[] = [];

    const CURTAINS = 7;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(40, Math.floor((w * h) / 22000));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: -0.08 - Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.1,
        c: Math.floor(Math.random() * COLORS.length),
        r: 1 + Math.random() * 1.6,
      }));
    };

    const drawCurtain = (i: number) => {
      const bandH = h * 0.66;
      const baseX = ((i + 0.5) / CURTAINS) * w + Math.sin(t * 0.4 + i) * 40;
      const width = 90 + (i % 3) * 36;
      const amp = 46 + (i % 4) * 16;
      const freq = 0.005 + (i % 3) * 0.0014;
      const phase = i * 1.7 + t * (0.5 + (i % 3) * 0.18);
      const [r, g, b] = COLORS[i % COLORS.length];

      const grad = ctx.createLinearGradient(0, 0, 0, bandH);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.28, `rgba(${r},${g},${b},0.30)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.10)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      const seg = 20;
      ctx.beginPath();
      for (let s = 0; s <= seg; s++) {
        const y = (s / seg) * bandH;
        const x = baseX + amp * Math.sin(y * freq + phase);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let s = seg; s >= 0; s--) {
        const y = (s / seg) * bandH;
        const x = baseX + width + amp * Math.sin(y * freq + phase + 0.6);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = "blur(26px)";
      for (let i = 0; i < CURTAINS; i++) drawCurtain(i);

      ctx.filter = "none";
      for (const m of motes) {
        if (!reduce) {
          m.y += m.vy;
          m.x += m.vx;
          if (m.y < -6) {
            m.y = h + 6;
            m.x = Math.random() * w;
          }
        }
        const [r, g, b] = COLORS[m.c];
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";

      if (!reduce) {
        t += 0.005;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
