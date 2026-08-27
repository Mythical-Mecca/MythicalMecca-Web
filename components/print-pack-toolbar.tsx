"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Screen-only controls for the station pack.
 *
 * The pack itself is static server-rendered HTML — this only decides how it
 * looks on the way to the printer, so it is the one client component in the
 * feature.
 *
 * Zoom exists because a 210mm sheet is wider than most windows once a sidebar
 * is in the way, and a preview you have to scroll sideways through is not a
 * preview. It scales the sheets on screen and is ignored entirely in print.
 */
export function PrintPackToolbar({ pageCount }: { pageCount: number }) {
  const [dark, setDark] = useState(false);
  const [zoom, setZoom] = useState(1);

  // The theme and zoom live on the pack element rather than in React state
  // threaded through every sheet: both are pure presentation, and the sheets
  // are server-rendered.
  useEffect(() => {
    const pack = document.querySelector<HTMLElement>(".mm-pack");
    if (!pack) return;
    pack.dataset.packTheme = dark ? "dark" : "paper";
  }, [dark]);

  useEffect(() => {
    const pack = document.querySelector<HTMLElement>(".mm-pack");
    if (!pack) return;
    pack.style.setProperty("--pack-zoom", String(zoom));
    // A scaled sheet still reserves its unscaled height, leaving a growing gap
    // under each one. Pulling the margin back by the shortfall closes it.
    pack.style.setProperty(
      "--pack-shrink",
      `${(1 - zoom) * 297}mm`
    );
  }, [zoom]);

  // Fit the sheet to the window on first paint, so the pack opens readable
  // rather than clipped. 210mm ≈ 794px at 96dpi, plus breathing room.
  useEffect(() => {
    const fit = () => {
      const available = window.innerWidth - 96;
      setZoom(Math.min(1, Math.max(0.35, available / 794)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="mm-pack-chrome mb-6 flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="mm-btn mm-btn-primary"
      >
        <Icon icon="mdi:printer-outline" width={16} />
        Print {pageCount} sheet{pageCount === 1 ? "" : "s"}
      </button>

      <button
        type="button"
        onClick={() => setDark((d) => !d)}
        className="mm-btn mm-btn-ghost text-sm"
        aria-pressed={dark}
      >
        <Icon
          icon={dark ? "mdi:weather-night" : "mdi:white-balance-sunny"}
          width={16}
        />
        {dark ? "Dark stock" : "Paper"}
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))}
          aria-label="Zoom out"
          className="mm-btn mm-btn-ghost h-11 w-11 justify-center p-0"
        >
          <Icon icon="mdi:minus" width={16} />
        </button>
        <span className="w-12 text-center text-xs tabular-nums text-[var(--mm-text-dim)]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
          aria-label="Zoom in"
          className="mm-btn mm-btn-ghost h-11 w-11 justify-center p-0"
        >
          <Icon icon="mdi:plus" width={16} />
        </button>
      </div>
    </div>
  );
}
