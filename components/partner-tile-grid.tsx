"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";

export interface PartnerTileData {
  slug: string;
  businessName: string;
  tagline?: string | null;
  isPremium?: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  gallery: { imageUrl?: string; title?: string; caption?: string; kind?: string }[];
}

interface PartnerTileGridProps {
  partners: PartnerTileData[];
  categoryName?: string;
}

export function PartnerTileGrid({ partners, categoryName }: PartnerTileGridProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  const imagesWithPartners: { image: LightboxImage; partnerSlug: string }[] = partners.map(
    (p) => {
      const hero = p.bannerUrl ?? p.gallery.find((g) => g.imageUrl)?.imageUrl;
      return {
        image: {
          src: hero || "",
          alt: p.businessName,
          title: p.businessName,
          caption: p.tagline || undefined,
          badge: p.isPremium ? "Premium Partner" : categoryName || "Partner",
        },
        partnerSlug: p.slug,
      };
    }
  );

  const currentImage =
    activeImageIndex !== null && imagesWithPartners[activeImageIndex]?.image.src
      ? imagesWithPartners[activeImageIndex].image
      : null;

  const validImageIndices = imagesWithPartners
    .map((item, idx) => (item.image.src ? idx : -1))
    .filter((idx) => idx !== -1);

  const currentValidPos =
    activeImageIndex !== null ? validImageIndices.indexOf(activeImageIndex) : -1;

  const handlePrev = () => {
    if (currentValidPos > 0) {
      setActiveImageIndex(validImageIndices[currentValidPos - 1]);
    }
  };

  const handleNext = () => {
    if (currentValidPos >= 0 && currentValidPos < validImageIndices.length - 1) {
      setActiveImageIndex(validImageIndices[currentValidPos + 1]);
    }
  };

  return (
    <>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {partners.map((p, idx) => {
          const hero = p.bannerUrl ?? p.gallery.find((g) => g.imageUrl)?.imageUrl;

          return (
            <div
              key={p.slug}
              className="mm-glass group flex flex-col overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:border-[var(--mm-gold)] hover:shadow-xl hover:shadow-[color-mix(in_srgb,var(--mm-violet)_20%,transparent)]"
            >
              {/* Square Image Container */}
              <div className="relative aspect-square w-full overflow-hidden bg-[var(--mm-elevated)]">
                {hero ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={hero}
                    alt={p.businessName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(47,75,224,0.5), rgba(124,58,237,0.5))",
                    }}
                  />
                )}

                {/* Quick Expand Button on Image */}
                {hero && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveImageIndex(idx);
                    }}
                    title="Expand image to fullscreen"
                    aria-label={`Expand ${p.businessName} image`}
                    className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Icon icon="mdi:magnify-plus-outline" width={17} />
                  </button>
                )}

                {/* Subtle gradient overlay at bottom of image for polish */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
              </div>

              {/* Card Details (Makes total tile height longer and nicely proportioned) */}
              <Link
                href={`/partners/${p.slug}`}
                className="flex flex-1 flex-col justify-between p-5 outline-none"
              >
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    {p.isPremium ? (
                      <Badge color="var(--mm-gold)" icon="mdi:crown">
                        Premium
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-[var(--mm-text-dim)]">
                      {p.gallery.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {p.logoUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.logoUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                      />
                    )}
                    <h3 className="font-medium tracking-wide transition-colors group-hover:text-[var(--mm-gold)]">
                      {p.businessName}
                    </h3>
                  </div>

                  {p.tagline && (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--mm-text-dim)] leading-relaxed">
                      {p.tagline}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)] transition-colors group-hover:text-[var(--mm-gold)]">
                  <span>View stall</span>
                  <Icon
                    icon="mdi:arrow-right"
                    width={14}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <ImageLightbox
        image={currentImage}
        onClose={() => setActiveImageIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={currentValidPos > 0}
        hasNext={currentValidPos >= 0 && currentValidPos < validImageIndices.length - 1}
      />
    </>
  );
}
