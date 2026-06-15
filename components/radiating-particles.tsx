"use client";

import { useEffect, useRef } from "react";

type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  hue: string;
};

/**
 * Particles that drift outward from a rectangular border (the menu's edges),
 * rendered behind the nav menu. Subtle by design. Only animates while `active`.
 * Honors prefers-reduced-motion (static frame).
 */
export function RadiatingParticles({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const colors = ["242, 180, 65", "74, 168, 255", "255, 210, 122"];
    let raf = 0;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let frame = 0;
    let ps: P[] = [];

    // Spawn on the perimeter of a rectangle (~the menu's footprint), moving
    // outward (perpendicular to the nearest edge, away from centre).
    const spawn = (): P => {
      const rw = Math.min(w * 0.78, 600);
      const rh = Math.min(h * 0.62, 470);
      const left = cx - rw / 2;
      const top = cy - rh / 2;
      const per = 2 * (rw + rh);
      const d = Math.random() * per;
      let x: number;
      let y: number;
      let nx: number;
      let ny: number;
      if (d < rw) {
        x = left + d;
        y = top;
        nx = 0;
        ny = -1;
      } else if (d < rw + rh) {
        x = left + rw;
        y = top + (d - rw);
        nx = 1;
        ny = 0;
      } else if (d < 2 * rw + rh) {
        x = left + rw - (d - rw - rh);
        y = top + rh;
        nx = 0;
        ny = 1;
      } else {
        x = left;
        y = top + rh - (d - 2 * rw - rh);
        nx = -1;
        ny = 0;
      }
      const speed = 0.2 + Math.random() * 0.5;
      return {
        x,
        y,
        vx: nx * speed + (Math.random() - 0.5) * 0.12,
        vy: ny * speed + (Math.random() - 0.5) * 0.12,
        life: 0,
        max: 130 + Math.random() * 120,
        r: 0.6 + Math.random() * 1.1,
        hue: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      cx = w / 2;
      cy = h / 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;
      if (!reduce) {
        // one new mote every other frame, capped low to stay subtle
        if (frame % 2 === 0 && ps.length < 120) ps.push(spawn());
      } else if (ps.length === 0) {
        for (let i = 0; i < 50; i++) {
          const p = spawn();
          p.life = Math.random() * p.max;
          p.x += p.vx * p.life;
          p.y += p.vy * p.life;
          ps.push(p);
        }
      }
      ps = ps.filter((p) => p.life < p.max);
      for (const p of ps) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
        }
        const t = p.life / p.max;
        const alpha = Math.sin(t * Math.PI) * 0.28;
        ctx.fillStyle = `rgba(${p.hue}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
