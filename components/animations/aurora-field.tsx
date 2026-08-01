"use client";

import { useEffect, useRef } from "react";
import { runAmbientLoop } from "./ambient-loop";

type Mote = { x: number; y: number; vy: number; vx: number; c: number; r: number };

// green, purple, teal — matched to the aurora art
const COLORS: [number, number, number][] = [
  [78, 214, 142],
  [150, 104, 255],
  [72, 200, 214],
];

// Drift is authored against a 60fps baseline; each frame advances by however
// much wall-clock time it represents, so changing `fps` changes the cost but
// NOT the apparent speed.
const BASE_FPS = 60;
const SPEED_AT_60 = 1;

// The curtain canvas renders at a fraction of layout resolution and is then
// upscaled by the browser — the bilinear filtering of that upscale is itself a
// free blur, so only a small CSS blur is needed on top to kill the banding
// between the 7 additive bands.
//
// This matters a lot: a CSS `filter: blur()` is applied in *layout* pixels over
// the whole composited layer, so its cost tracks the element's on-screen size
// and the radius — NOT the canvas backing size. At 24px over a full viewport it
// re-ran a large gaussian on every one of this canvas's 30 frames per second.
// Dropping to 10px and leaning on the upscale looks near-identical for a
// fraction of the cost.
const CURTAIN_SCALE = 0.3;
const CURTAIN_BLUR_PX = 10;

/**
 * Pre-render one glowing mote per colour to a small sprite canvas. Drawing
 * sprites with drawImage is dramatically cheaper than the previous per-fill
 * `shadowBlur`, which ran a gaussian on the CPU for every mote every frame.
 */
function makeMoteSprites(): HTMLCanvasElement[] {
  return COLORS.map(([r, g, b]) => {
    const size = 32;
    const half = size / 2;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const ctx = sprite.getContext("2d")!;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return sprite;
  });
}

/**
 * Flowing aurora curtains (green / purple / teal) plus drifting motes.
 *
 * Perf notes: curtains render on a quarter-resolution canvas softened by a
 * one-time GPU CSS blur; motes are pre-rendered glow sprites (no canvas
 * shadows). The loop runs at 30fps and pauses off-screen / in hidden tabs;
 * honors prefers-reduced-motion.
 */
export function AuroraField({
  className,
  fps = 30,
  /**
   * Cap on devicePixelRatio for the mote canvas. Ambient backdrops sit behind
   * content and drift slowly, so rendering them at 1x on HiDPI displays is
   * invisible and cuts the fill work by up to 4x.
   */
  maxDpr = 1.5,
}: {
  className?: string;
  fps?: number;
  maxDpr?: number;
}) {
  const curtainRef = useRef<HTMLCanvasElement>(null);
  const moteRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const curtain = curtainRef.current;
    const mote = moteRef.current;
    if (!curtain || !mote) return;
    const cctx = curtain.getContext("2d");
    const mctx = mote.getContext("2d");
    if (!cctx || !mctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const sprites = makeMoteSprites();
    const SPEED = SPEED_AT_60 * (BASE_FPS / fps);

    let w = 0;
    let h = 0;
    let t = 0;
    let motes: Mote[] = [];

    const CURTAINS = 7;

    const resize = () => {
      const rect = curtain.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      w = rect.width;
      h = rect.height;
      curtain.width = w * CURTAIN_SCALE;
      curtain.height = h * CURTAIN_SCALE;
      cctx.setTransform(CURTAIN_SCALE, 0, 0, CURTAIN_SCALE, 0, 0);
      mote.width = w * dpr;
      mote.height = h * dpr;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(40, Math.floor((w * h) / 22000));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: SPEED * (-0.08 - Math.random() * 0.2),
        vx: SPEED * ((Math.random() - 0.5) * 0.1),
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

      const grad = cctx.createLinearGradient(0, 0, 0, bandH);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.28, `rgba(${r},${g},${b},0.30)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.10)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      const seg = 20;
      cctx.beginPath();
      for (let s = 0; s <= seg; s++) {
        const y = (s / seg) * bandH;
        const x = baseX + amp * Math.sin(y * freq + phase);
        if (s === 0) cctx.moveTo(x, y);
        else cctx.lineTo(x, y);
      }
      for (let s = seg; s >= 0; s--) {
        const y = (s / seg) * bandH;
        const x = baseX + width + amp * Math.sin(y * freq + phase + 0.6);
        cctx.lineTo(x, y);
      }
      cctx.closePath();
      cctx.fillStyle = grad;
      cctx.fill();
    };

    const step = () => {
      // curtains (softened once via CSS blur on the canvas element)
      cctx.clearRect(0, 0, w, h);
      cctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < CURTAINS; i++) drawCurtain(i);
      cctx.globalCompositeOperation = "source-over";

      // motes — glow sprites, no per-draw shadows
      mctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        if (!reduce) {
          m.y += m.vy;
          m.x += m.vx;
          if (m.y < -6) {
            m.y = h + 6;
            m.x = Math.random() * w;
          }
        }
        // sprite is drawn at ~5x the mote radius so the glow falloff reads
        // like the old 8px shadow
        const s = m.r * 10;
        mctx.drawImage(sprites[m.c], m.x - s / 2, m.y - s / 2, s, s);
      }

      if (!reduce) t += 0.005 * SPEED;
    };

    resize();
    const stop = runAmbientLoop(curtain, step, { fps, loop: !reduce });
    window.addEventListener("resize", resize);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
    };
  }, [fps, maxDpr]);

  const fill: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    display: "block",
  };

  return (
    <div className={className} style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={curtainRef}
        aria-hidden="true"
        style={{ ...fill, filter: `blur(${CURTAIN_BLUR_PX}px)` }}
      />
      <canvas ref={moteRef} aria-hidden="true" style={fill} />
    </div>
  );
}
