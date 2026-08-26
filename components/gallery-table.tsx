"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageUploader } from "@/components/image-uploader";
import { Modal } from "@/components/modal";
import { TextField } from "@/components/form";
import { Icon } from "@/components/icon";
import {
  addGalleryImages,
  removeGalleryImage,
  updateGalleryField,
} from "@/app/(admin)/actions";
import { ACCENT } from "@/lib/accents";
import type { AdminGalleryItem } from "@/lib/admin";

const VISIBILITY_OPTIONS = [
  { value: "1", label: "Shown", color: "var(--mm-live)", icon: "mdi:eye-outline" },
  {
    value: "",
    label: "Hidden",
    color: "var(--mm-text-dim)",
    icon: "mdi:eye-off-outline",
  },
];

/**
 * The admin gallery, as a table.
 *
 * A grid of thumbnails could show the photos but not what we now know about
 * them — how often each one gets opened, and by how many separate people. The
 * table carries both counts beside the caption, and keeps the picture large
 * enough (a wide thumbnail, not a chip) that a row is still recognisable as
 * the photo it describes.
 *
 * The two view columns are read-only: they are written by the public viewer,
 * and a number an admin can type over isn't a metric.
 *
 * Adding photos lives in a dialog off the toolbar rather than in a panel above
 * the table — same as every other admin list, and it keeps the screen about
 * the photos that are already there.
 */
export function GalleryTable({ items }: { items: AdminGalleryItem[] }) {
  const [adding, setAdding] = useState(false);

  const columns = useMemo<DataTableColumn<AdminGalleryItem>[]>(
    () => [
      {
        key: "imageUrl",
        header: "Photo",
        icon: "mdi:image-outline",
        value: (r) => r.imageUrl,
        width: "12rem",
        sortable: false,
        searchable: false,
        render: (r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imageUrl}
            alt={r.caption ?? ""}
            loading="lazy"
            className="h-24 w-40 rounded-lg border border-[var(--mm-border)] object-cover"
          />
        ),
      },
      {
        key: "caption",
        header: "Caption",
        icon: "mdi:text-short",
        value: (r) => r.caption,
        editable: true,
        width: "18rem",
        placeholder: "e.g. Midsummer Revel 2026",
      },
      {
        key: "published",
        header: "Visibility",
        icon: "mdi:eye-outline",
        kind: "select",
        options: VISIBILITY_OPTIONS,
        value: (r) => (r.published ? "1" : ""),
        editable: true,
        filterable: true,
      },
      {
        key: "views",
        header: "Views",
        icon: "mdi:cursor-default-click-outline",
        kind: "number",
        value: (r) => r.views,
        align: "right",
      },
      {
        key: "uniqueViews",
        header: "Unique views",
        icon: "mdi:account-eye-outline",
        kind: "number",
        value: (r) => r.uniqueViews,
        align: "right",
      },
      {
        key: "sort",
        header: "Order",
        icon: "mdi:sort-numeric-variant",
        kind: "number",
        value: (r) => r.sort,
        editable: true,
        align: "right",
      },
      {
        key: "createdAt",
        header: "Added",
        icon: "mdi:calendar-plus",
        kind: "datetime",
        value: (r) => r.createdAt,
      },
      {
        key: "id",
        header: "ID",
        icon: "mdi:identifier",
        value: (r) => r.id,
        mono: true,
        hiddenByDefault: true,
        searchable: false,
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        rows={items}
        columns={columns}
        rowId={(r) => r.id}
        onSave={updateGalleryField}
        storageKey="admin-gallery"
        accent={ACCENT.gallery}
        initialSort={{ key: "createdAt", dir: "desc" }}
        caption="Every homepage photo, with how often it has been opened"
        searchPlaceholder="Search captions…"
        emptyMessage="No photos yet. Add a few and they'll appear on the homepage."
        toolbar={
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-haspopup="dialog"
            className="mm-btn mm-btn-primary text-sm"
          >
            <Icon icon="mdi:plus" width={16} /> Add photos
          </button>
        }
        rowActions={(r) => (
          <form action={removeGalleryImage}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmButton
              label="Remove"
              confirmLabel="Remove photo"
              title="Remove this photo?"
              body="It comes off the homepage straight away, and its view counts go with it."
              icon="mdi:delete-outline"
              className="mm-btn mm-btn-ghost text-xs"
            />
          </form>
        )}
      />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add photos"
        description="They go straight onto the public homepage."
        icon="mdi:image-plus-outline"
        accent={ACCENT.gallery}
      >
        <form action={addGalleryImages} className="space-y-5">
          <ImageUploader
            name="images"
            entityType="gallery"
            maxFiles={24}
            accent={ACCENT.gallery}
            label="Upload community photos"
            description="Up to 24 · 10 MB each"
          />
          <TextField
            name="caption"
            label="Caption"
            hint="optional"
            icon="mdi:text-short"
            placeholder="e.g. Midsummer Revel 2026"
            description="Shared by every photo in this batch."
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="mm-btn mm-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="mm-btn mm-btn-primary">
              <Icon icon="mdi:plus" width={16} /> Add to gallery
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
