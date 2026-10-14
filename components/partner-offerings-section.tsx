"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";

export interface PartnerOfferingItem {
  id: string;
  name: string;
  kind: "product" | "service";
  description?: string | null;
  price?: string | null;
  imageUrl?: string | null;
  externalUrl?: string | null;
}

interface PartnerOfferingsSectionProps {
  offerings: PartnerOfferingItem[];
  partnerName: string;
}

export function PartnerOfferingsSection({
  offerings,
  partnerName,
}: PartnerOfferingsSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const validImages: { item: PartnerOfferingItem; origIndex: number }[] = offerings
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
          title: validImages[activeValidPos].item.name,
          caption:
            validImages[activeValidPos].item.description ||
            (validImages[activeValidPos].item.price
              ? `Price: ${validImages[activeValidPos].item.price}`
              : undefined),
          badge:
            validImages[activeValidPos].item.kind === "service"
              ? "Service"
              : "Product",
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

  if (offerings.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--mm-violet)]"
        />
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Products &amp; services
        </h2>
        <span className="text-xs text-[var(--mm-text-dim)]">
          ({offerings.length})
        </span>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {offerings.map((o, idx) => {
          return (
            <div
              key={o.id}
              className="mm-glass group flex flex-col justify-between overflow-hidden p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:border-[var(--mm-gold)] hover:shadow-xl hover:shadow-[color-mix(in_srgb,var(--mm-violet)_20%,transparent)]"
            >
              <div>
                {/* Square Image with click to expand */}
                <div
                  onClick={() => {
                    if (o.imageUrl) setOpenIndex(idx);
                  }}
                  className={`relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--mm-elevated)] ${
                    o.imageUrl ? "cursor-pointer" : ""
                  }`}
                >
                  {o.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={o.imageUrl}
                        alt={o.name}
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
                          "linear-gradient(135deg, rgba(47,75,224,0.35), rgba(124,58,237,0.35))",
                      }}
                    />
                  )}
                </div>

                <div className="mt-3 flex items-start justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-base leading-snug tracking-wide group-hover:text-[var(--mm-gold)] transition-colors">
                    {o.name}
                  </h3>
                  <Badge
                    color={
                      o.kind === "service"
                        ? "var(--mm-violet)"
                        : "var(--mm-gold)"
                    }
                  >
                    {o.kind === "service" ? "Service" : "Product"}
                  </Badge>
                </div>

                {o.description && (
                  <p className="mt-1 line-clamp-3 text-xs text-[var(--mm-text-dim)] leading-relaxed">
                    {o.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-[var(--mm-border)] flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--mm-gold)]">
                  {o.price ?? "Price on request"}
                </p>

                {o.externalUrl && (
                  <a
                    href={o.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-gold)] transition-colors"
                  >
                    <Icon icon="mdi:open-in-new" width={14} /> View
                  </a>
                )}
              </div>
            </div>
          );
        })}
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
