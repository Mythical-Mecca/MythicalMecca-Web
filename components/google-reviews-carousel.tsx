"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/components/icon";
import { StarRating } from "@/components/star-rating";

import Script from "next/script";

export interface GoogleReview {
  id: string;
  authorName: string;
  rating: number;
  timeAgo: string;
  text: string;
  avatarUrl?: string;
}

const SAMPLE_REVIEWS: GoogleReview[] = [
  {
    id: "1",
    authorName: "Marcus Vance",
    rating: 5,
    timeAgo: "2 weeks ago",
    text: "The best community gathering I've been to! The tabletop tournaments and scavenger hunts were incredible. Found so many unique dice and miniatures from local creators.",
  },
  {
    id: "2",
    authorName: "Elena Rostova",
    rating: 5,
    timeAgo: "a month ago",
    text: "Mythical Mecca is pure magic. Welcoming to every kind of nerd, from casual board gamers to full-on cosplayers. The energy is always fantastic!",
  },
  {
    id: "3",
    authorName: "Liam Chen",
    rating: 5,
    timeAgo: "a month ago",
    text: "Phenomenal events and community spirit. The artisan stalls have items you won't find anywhere else. Can't wait for the next gathering!",
  },
  {
    id: "4",
    authorName: "Sarah Jenkins",
    rating: 5,
    timeAgo: "2 months ago",
    text: "Family-friendly, engaging, and so much fun. My kids loved the quest trails and meeting other creators. 10/10 recommendation for anyone looking for adventure.",
  },
];

interface GoogleReviewsCarouselProps {
  /** Optional custom reviews list */
  reviews?: GoogleReview[];
  /** Google Place review URL */
  googleReviewUrl?: string;
  /** Google Maps Place URL */
  googleMapsUrl?: string;
  /** Overall average rating (e.g. 5.0) */
  averageRating?: number;
  /** Total review count */
  totalReviews?: number;
  /** Optional Elfsight / embed widget ID */
  widgetId?: string;
}

export function GoogleReviewsCarousel({
  reviews = SAMPLE_REVIEWS,
  googleReviewUrl = "https://g.page/r/CbvIgVowljhSEAE/review",
  googleMapsUrl = "https://www.google.com/maps/place/?q=place_id:ChIJGxK63Jmig6URu8iBWjCWOFI",
  averageRating = 5.0,
  totalReviews = 48,
  widgetId = "2b5f2498-c955-40f5-8a19-c3923a340476",
}: GoogleReviewsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const existing = document.querySelector('script[src="https://elfsightcdn.com/platform.js"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://elfsightcdn.com/platform.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      try {
        (window as unknown as { eapps?: { platform?: { init?: () => void } } })
          ?.eapps?.platform?.init?.();
      } catch {
        // ignore
      }
    }
  }, [widgetId]);

  if (widgetId) {
    return (
      <div className="mm-glass overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--mm-gold)_35%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_65%,transparent)] p-4 shadow-lg backdrop-blur-md">
        <div className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
        <Script src="https://elfsightcdn.com/platform.js" strategy="afterInteractive" />
      </div>
    );
  }

  const total = reviews.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-advance every 6 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 7000);
  };

  // Touch & Mouse handlers for swiping
  const minSwipeDistance = 50;
  const [mouseDownStart, setMouseDownStart] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextSlide();
      resetTimer();
    } else if (isRightSwipe) {
      prevSlide();
      resetTimer();
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setMouseDownStart(e.clientX);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (mouseDownStart === null) return;
    const distance = mouseDownStart - e.clientX;
    if (distance > minSwipeDistance) {
      nextSlide();
      resetTimer();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
      resetTimer();
    }
    setMouseDownStart(null);
  };

  const current = reviews[activeIndex];

  return (
    <div className="mm-glass relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--mm-gold)_35%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_65%,transparent)] p-6 shadow-lg backdrop-blur-md">
      {/* Header with Google Logo & Rating */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mm-divider)] pb-4">
        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 transition hover:opacity-90 group"
        >
          {/* Google Icon */}
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm group-hover:scale-105 transition-transform">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white group-hover:text-[var(--mm-gold)] transition-colors">
                Google Reviews
              </span>
              <Icon icon="mdi:check-decagram" width={14} className="text-[#4285F4]" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
              <span className="font-bold text-white">{averageRating.toFixed(1)}</span>
              <StarRating value={averageRating} width={13} />
              <span>({totalReviews}+ reviews)</span>
            </div>
          </div>
        </a>

        {/* Action button to leave a Google Review */}
        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--mm-gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--mm-gold)_15%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--mm-gold)] transition hover:bg-[color-mix(in_srgb,var(--mm-gold)_28%,transparent)]"
        >
          <Icon icon="mdi:pencil-outline" width={13} />
          <span>Write a Review</span>
        </a>
      </div>

      {/* Swipeable Review Body */}
      <div
        className="my-4 min-h-[120px] select-none cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--mm-gold)]/20 text-xs font-bold text-[var(--mm-gold)]">
              {current.authorName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{current.authorName}</p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                <StarRating value={current.rating} width={12} />
                <span>·</span>
                <span>{current.timeAgo}</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-[var(--mm-text-dim)]">
            {activeIndex + 1} / {total}
          </span>
        </div>

        <p className="mt-3 text-sm italic text-[var(--mm-text)] leading-relaxed">
          &ldquo;{current.text}&rdquo;
        </p>
      </div>

      {/* Controls & Pagination Footer */}
      <div className="flex items-center justify-between border-t border-[var(--mm-divider)] pt-3 text-xs">
        {/* Carousel Dots & Google Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                onClick={() => {
                  setActiveIndex(i);
                  resetTimer();
                }}
                aria-label={`Go to review ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex
                    ? "w-6 bg-[var(--mm-gold)]"
                    : "w-2 bg-[var(--mm-border)] hover:bg-[var(--mm-text-dim)]"
                }`}
              />
            ))}
          </div>
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-[var(--mm-gold)] hover:underline font-medium"
          >
            <span>Read on Google</span>
            <Icon icon="mdi:open-in-new" width={11} />
          </a>
        </div>

        {/* Prev / Next Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              prevSlide();
              resetTimer();
            }}
            aria-label="Previous review"
            className="grid h-7 w-7 place-items-center rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-white"
          >
            <Icon icon="mdi:chevron-left" width={18} />
          </button>
          <button
            onClick={() => {
              nextSlide();
              resetTimer();
            }}
            aria-label="Next review"
            className="grid h-7 w-7 place-items-center rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] text-[var(--mm-text-dim)] transition hover:border-[var(--mm-gold)] hover:text-white"
          >
            <Icon icon="mdi:chevron-right" width={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
