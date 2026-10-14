"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";

export interface LightboxImage {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  badge?: string;
}

interface ImageLightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function ImageLightbox({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && onPrev) {
        e.stopPropagation();
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        e.stopPropagation();
        onNext();
      }
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    if (!image) return;

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [image, handleKeyDown]);

  if (!image || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.title || image.caption || "Expanded image"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-opacity duration-200 sm:p-8"
      onClick={onClose}
    >
      {/* Top action bar: Close button */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close fullscreen preview"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mm-gold)]"
        >
          <Icon icon="mdi:close" width={22} />
        </button>
      </div>

      {/* Previous button */}
      {hasPrev && onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mm-gold)]"
        >
          <Icon icon="mdi:chevron-left" width={28} />
        </button>
      )}

      {/* Next button */}
      {hasNext && onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mm-gold)]"
        >
          <Icon icon="mdi:chevron-right" width={28} />
        </button>
      )}

      {/* Main container holding the image and caption */}
      <div
        className="relative flex max-h-full max-w-full flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt || image.title || image.caption || ""}
          className="max-h-[82vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
        />

        {/* Caption / Title pill */}
        {(image.title || image.caption || image.badge) && (
          <div className="mt-4 flex max-w-xl flex-col items-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {image.badge && (
                <span className="rounded-full bg-[var(--mm-gold)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--mm-gold)] border border-[var(--mm-gold)]/30">
                  {image.badge}
                </span>
              )}
              {image.title && (
                <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-white tracking-wide">
                  {image.title}
                </span>
              )}
            </div>
            {image.caption && (
              <p className="mt-1 text-sm text-[var(--mm-text-dim)] text-white/80">
                {image.caption}
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
