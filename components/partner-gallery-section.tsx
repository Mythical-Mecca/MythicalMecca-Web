"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";

export interface GalleryItem {
  title: string;
  caption: string;
  imageUrl?: string;
  kind?: string;
}

interface PartnerGallerySectionProps {
  title: string;
  items: GalleryItem[];
}

export function PartnerGallerySection({ title, items }: PartnerGallerySectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const validImages: { item: GalleryItem; origIndex: number }[] = items
    .map((item, origIndex) => ({ item, origIndex }))
    .filter((entry) => Boolean(entry.item.imageUrl));

  const activeValidPos =
    openIndex !== null
      ? validImages.findIndex((entry) => entry.origIndex === openIndex)
      : -1;

  const currentImage: LightboxImage | null =
    activeValidPos !== -1
      ? {
          src: validImages[activeValidPos].item.imageUrl!,
          title: validImages[activeValidPos].item.title || title,
          caption: validImages[activeValidPos].item.caption || undefined,
          badge: title,
        }
      : null;

  const handlePrev = () => {
    if (activeValidPos > 0) {
      setOpenIndex(validImages[activeValidPos - 1].origIndex);
    }
  };

  const handleNext = () => {
    if (activeValidPos >= 0 && activeValidPos < validImages.length - 1) {
      setOpenIndex(validImages[activeValidPos + 1].origIndex);
    }
  };

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--mm-gold)]"
        />
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
          {title}
        </h2>
        <span className="text-xs text-[var(--mm-text-dim)]">
          ({items.length})
        </span>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((g, i) => (
          <div
            key={i}
            onClick={() => {
              if (g.imageUrl) setOpenIndex(i);
            }}
            className={`mm-glass group flex flex-col overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:border-[var(--mm-gold)] hover:shadow-xl hover:shadow-[color-mix(in_srgb,var(--mm-violet)_20%,transparent)] ${
              g.imageUrl ? "cursor-pointer" : ""
            }`}
          >
            {/* Square Image Box */}
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--mm-elevated)]">
              {g.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.imageUrl}
                    alt={g.title || g.caption || title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                      <Icon icon="mdi:magnify-plus-outline" width={20} />
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(124,58,237,0.45), rgba(245,196,81,0.35))",
                  }}
                />
              )}
            </div>

            {/* Content info below square image */}
            {(g.title || g.caption) && (
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  {g.title && (
                    <p className="font-medium tracking-wide transition-colors group-hover:text-[var(--mm-gold)]">
                      {g.title}
                    </p>
                  )}
                  {g.caption && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--mm-text-dim)]">
                      {g.caption}
                    </p>
                  )}
                </div>
                {g.imageUrl && (
                  <p className="mt-3 flex items-center gap-1 text-[11px] text-[var(--mm-text-dim)] group-hover:text-[var(--mm-gold)]">
                    <Icon icon="mdi:fullscreen" width={13} />
                    <span>Click to expand</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ImageLightbox
        image={currentImage}
        onClose={() => setOpenIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={activeValidPos > 0}
        hasNext={activeValidPos >= 0 && activeValidPos < validImages.length - 1}
      />
    </section>
  );
}
