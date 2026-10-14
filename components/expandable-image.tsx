"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { ImageLightbox } from "@/components/image-lightbox";

interface ExpandableImageProps {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  badge?: string;
  className?: string;
  containerClassName?: string;
}

export function ExpandableImage({
  src,
  alt = "",
  title,
  caption,
  badge,
  className = "",
  containerClassName = "",
}: ExpandableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`group relative cursor-pointer overflow-hidden ${containerClassName}`}
        title="Click to expand"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`transition-transform duration-500 group-hover:scale-105 ${className}`}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
            <Icon icon="mdi:magnify-plus-outline" width={20} />
          </span>
        </div>
      </div>

      <ImageLightbox
        image={open ? { src, alt, title, caption, badge } : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
