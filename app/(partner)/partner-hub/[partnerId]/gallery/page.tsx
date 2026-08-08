import { notFound } from "next/navigation";
import { getPartnerForHub, listMyGallery } from "@/lib/partner";
import { addGalleryItem, removeGalleryItem } from "../../../actions";
import { ImageUploader } from "@/components/image-uploader";
import { TextField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";

export default async function StallGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  // Access is already enforced by the [partnerId] layout.
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  if (!partner) notFound();
  const gallery = await listMyGallery(partner.id);
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-3xl space-y-6">
      {saved && <Flash>Gallery updated.</Flash>}
      {error && (
        <Flash tone="error">Could not update — add at least one image.</Flash>
      )}

      <FormCard title="Add to your gallery" icon="mdi:plus" accent="#E18D01">
        <form action={addGalleryItem} className="space-y-5">
          <input type="hidden" name="partnerId" value={partner.id} />
          <ImageUploader
            name="images"
            entityType="partner_gallery"
            maxFiles={12}
            accent="#E18D01"
            label="Upload product photos"
            description="Up to 12 · 10 MB each"
          />
          <PickerField
            name="kind"
            label="Kind"
            icon="mdi:shape-outline"
            defaultValue="art"
            description="How should these items be shown?"
            options={[
              { value: "art", label: "Art", hint: "One-off pieces and commissions." },
              { value: "product", label: "Product", hint: "Things you sell more than one of." },
            ]}
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
                <Badge className="absolute left-1.5 top-1.5 !bg-black/60 !text-white">
                  {g.kind === "product" ? "Product" : "Art"}
                </Badge>
                <form
                  action={removeGalleryItem}
                  className="absolute right-1.5 top-1.5"
                >
                  <input type="hidden" name="partnerId" value={partner.id} />
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
