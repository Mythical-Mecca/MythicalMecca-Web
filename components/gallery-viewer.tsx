"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/lib/format";
import { countGalleryView } from "@/app/(public)/actions";
import type { GalleryImage } from "@/lib/content";

/**
 * The homepage gallery: a grid of tiles, any of which opens full size.
 *
 * The tiles are buttons rather than decorated divs — opening a photo is the
 * whole point of the section, and that has to be reachable from a keyboard.
 *
 * Sharing hands over the gallery's own URL rather than a deep link to the open
 * photo: the dialog lives in a portal, portals cannot be server-rendered, and
 * so an arriving link could only open one by setting state from an effect on
 * every visit. The section anchor costs the recipient one scroll and keeps the
 * first paint honest.
 */
export function GalleryViewer({ tiles }: { tiles: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const open = openIndex === null ? null : (tiles[openIndex] ?? null);

  // Counted per open, not per render — and fire-and-forget, because a photo
  // that fails to be counted must still be a photo you can look at.
  useEffect(() => {
    if (!open?.id) return;
    void countGalleryView(open.id).catch(() => {});
  }, [open?.id]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(t);
  }, [note]);

  function galleryLink(): string {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "gallery";
    return url.toString();
  }

  async function share(item: GalleryImage) {
    const url = galleryLink();
    const title = item.caption ?? "Mythical Mecca gallery";
    const text = item.caption
      ? `${item.caption} — from the Mythical Mecca gallery`
      : "From the Mythical Mecca gallery";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch (err) {
      // Dismissing the share sheet is a decision, not a failure.
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setNote("Link copied");
      } catch {
        setNote("Couldn't share that one");
      }
    }
  }

  // An empty gallery says so. It used to be papered over with stock photos,
  // which made "nobody has uploaded anything" look identical to "the hall is
  // full" — and hid a failing query completely.
  if (tiles.length === 0) {
    return (
      <div className="mm-glass mt-8 p-8 text-center text-[var(--mm-text-dim)]">
        No photos hung yet — the first shots from the hall will appear here.
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((tile, i) => (
          <button
            key={tile.id ?? i}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-haspopup="dialog"
            aria-label={
              tile.caption ? `View ${tile.caption}` : "View gallery photo"
            }
            className="group relative h-44 overflow-hidden rounded-2xl border border-[var(--mm-border)] text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mm-gold)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.imageUrl}
              alt={tile.caption ?? ""}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <Icon icon="mdi:magnify-plus-outline" width={16} />
            </span>
            {tile.caption && (
              <span
                className="absolute inset-x-0 bottom-0 block p-3"
                style={{
                  background:
                    "linear-gradient(to top, rgba(11,15,28,0.9), transparent)",
                }}
              >
                <span className="text-sm font-medium text-[var(--mm-text)]">
                  {tile.caption}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      <Modal
        open={open !== null}
        onClose={() => setOpenIndex(null)}
        title={open?.caption ?? "Gallery photo"}
        description={open?.createdAt ? formatDateTime(open.createdAt) : undefined}
        icon="mdi:image-outline"
        accent="var(--mm-gold)"
        size="xl"
      >
        {open && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.imageUrl}
              alt={open.caption ?? ""}
              className="mx-auto max-h-[68dvh] w-auto max-w-full rounded-xl object-contain"
            />
            {/* The label and the timestamp are the dialog's heading — see the
                Modal's title/description above. This row is just the share
                control and whatever it has to say for itself. */}
            <div className="flex items-center justify-end gap-3">
              <div className="flex shrink-0 items-center gap-2">
                {note && (
                  <span
                    role="status"
                    className="text-xs text-[var(--mm-text-dim)]"
                  >
                    {note}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void share(open)}
                  title="Share this photo"
                  aria-label="Share this photo"
                  className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--mm-border)] text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                >
                  <Icon icon="mdi:share-variant-outline" width={19} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
