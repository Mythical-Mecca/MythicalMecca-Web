"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

type DetectorLike = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Camera QR reader.
 *
 * Uses the platform `BarcodeDetector` when it exists (Android Chrome — hardware
 * accelerated, negligible battery cost over a long event day) and falls back to
 * jsQR everywhere else, which matters because iOS Safari has no BarcodeDetector
 * and half the phones at any event are iPhones.
 *
 * jsQR is loaded lazily on the fallback path only, so Android never pays for it.
 */
export function QrScanner({
  onResult,
  paused = false,
  label = "Point the camera at the code",
}: {
  onResult: (value: string) => void;
  paused?: boolean;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<DetectorLike | null>(null);
  const jsqrRef = useRef<((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null>(null);
  const pausedRef = useRef(paused);
  const lastHit = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handle = useCallback(
    (value: string) => {
      const now = Date.now();
      // The camera sees the same code many times a second; only fire once.
      if (lastHit.current.value === value && now - lastHit.current.at < 3000) {
        return;
      }
      lastHit.current = { value, at: now };
      onResult(value);
    },
    [onResult]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setReady(true);

        const Detector = (
          window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => DetectorLike }
        ).BarcodeDetector;
        if (Detector) {
          detectorRef.current = new Detector({ formats: ["qr_code"] });
        } else {
          const mod = await import("jsqr");
          jsqrRef.current = mod.default as typeof jsqrRef.current;
        }

        const tick = async () => {
          rafRef.current = requestAnimationFrame(() => void tick());
          if (pausedRef.current || !video.videoWidth) return;

          if (detectorRef.current) {
            try {
              const hits = await detectorRef.current.detect(video);
              if (hits[0]?.rawValue) handle(hits[0].rawValue);
            } catch {
              // A failed frame is normal — keep scanning.
            }
            return;
          }

          const canvas = canvasRef.current;
          const jsQR = jsqrRef.current;
          if (!canvas || !jsQR) return;
          // Downscale before decoding: jsQR is O(pixels) and a 1080p frame is
          // needless work for a code that fills a good part of the viewfinder.
          const w = 400;
          const h = Math.round((video.videoHeight / video.videoWidth) * w);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, w, h);
          const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
          if (hit?.data) handle(hit.data);
        };
        void tick();
      } catch {
        if (!cancelled) {
          // The old copy said "use the code instead", but there is no code
          // entry on this screen — it was a dead end. The fallback that always
          // works is the phone's own camera app, which opens check-in directly
          // because the tag is a plain URL.
          setError(
            "Camera blocked. Point your phone's normal camera app at the code instead — it opens check-in directly."
          );
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [handle]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-6 text-center"
      >
        <Icon
          icon="mdi:camera-off-outline"
          width={28}
          className="mx-auto text-[var(--mm-text-dim)]"
        />
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-square w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* Viewfinder frame — gives people something to aim at. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-3/5 w-3/5 rounded-2xl border-2 border-[var(--mm-gold)] shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
      </div>
      <p className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center text-xs text-white">
        {ready ? label : "Starting camera…"}
      </p>
    </div>
  );
}
