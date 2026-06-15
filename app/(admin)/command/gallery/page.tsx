import { listGallery } from "@/lib/admin";
import { addGalleryImages, removeGalleryImage } from "../../actions";
import { ImageUploader } from "@/components/image-uploader";
import { TextField, FormCard, PageHeader } from "@/components/form";
import { Icon } from "@/components/icon";

const ACCENT = "#e0b0ff";

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const items = await listGallery();
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="Gallery"
        sub="Community photos shown on the public homepage."
        icon="mdi:image-multiple-outline"
        accent={ACCENT}
      />

      {saved && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Gallery updated.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not update — add at least one image.
        </div>
      )}

      <FormCard title="Add photos" icon="mdi:plus" accent={ACCENT}>
        <form action={addGalleryImages} className="space-y-5">
          <ImageUploader
            name="images"
            entityType="gallery"
            maxFiles={24}
            accent={ACCENT}
            label="Upload community photos"
            description="Up to 24 · 10 MB each"
          />
          <TextField
            name="caption"
            label="Caption"
            hint="optional"
            icon="mdi:text-short"
            placeholder="e.g. Midsummer Revel 2026"
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Add to gallery
          </button>
        </form>
      </FormCard>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Photos{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({items.length})
          </span>
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No photos yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {items.map((g) => (
              <div
                key={g.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--mm-border)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.imageUrl}
                  alt={g.caption ?? ""}
                  className="h-full w-full object-cover"
                />
                <form action={removeGalleryImage} className="absolute right-1.5 top-1.5">
                  <input type="hidden" name="id" value={g.id} />
                  <button
                    className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <Icon icon="mdi:close" width={14} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
