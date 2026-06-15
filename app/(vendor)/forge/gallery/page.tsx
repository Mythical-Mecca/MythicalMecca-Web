import { auth } from "@/lib/auth";
import { getMyVendor, listMyGallery } from "@/lib/vendor";
import { addGalleryItem, removeGalleryItem } from "../../actions";
import { ImageUploader } from "@/components/image-uploader";
import { TextField, FormCard, PageHeader } from "@/components/form";
import { Icon } from "@/components/icon";

export default async function ForgeGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  const vendor = await getMyVendor(session!.user.id);
  const gallery = vendor ? await listMyGallery(vendor.id) : [];
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Gallery"
        sub="Show off your wares — these appear on your public stall."
        icon="mdi:image-multiple-outline"
        accent="#f2b441"
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

      <FormCard title="Add to your gallery" icon="mdi:plus" accent="#f2b441">
        <form action={addGalleryItem} className="space-y-5">
          <ImageUploader
            name="images"
            entityType="vendor_gallery"
            maxFiles={12}
            accent="#f2b441"
            label="Upload product photos"
            description="Up to 12 · 10 MB each"
          />
          <TextField
            name="caption"
            label="Caption"
            hint="optional"
            icon="mdi:text-short"
            description="Applies to the images you add now."
            placeholder="e.g. 32mm scale, hand-painted"
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Add to gallery
          </button>
        </form>
      </FormCard>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Items{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({gallery.length})
          </span>
        </h2>
        {gallery.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No gallery items yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((g) => (
              <div
                key={g.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--mm-border)]"
              >
                {g.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={g.imageUrl}
                    alt={g.caption ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                    <Icon icon="mdi:image-off-outline" width={28} />
                  </div>
                )}
                {g.caption && (
                  <div
                    className="absolute inset-x-0 bottom-0 truncate p-2 text-xs text-white"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(11,15,28,0.9), transparent)",
                    }}
                  >
                    {g.caption}
                  </div>
                )}
                <form action={removeGalleryItem} className="absolute right-1.5 top-1.5">
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
