import { auth } from "@/lib/auth";
import { getMyVendor, listMyGallery } from "@/lib/vendor";
import { FileUploader } from "@/components/file-uploader";
import { addGalleryItem, removeGalleryItem } from "../../actions";

const inputCls =
  "w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]";

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
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Gallery
      </h1>

      {saved && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Gallery updated.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not update.
        </div>
      )}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Upload media
        </h2>
        <FileUploader entityType="vendor_gallery" />
      </section>

      <section className="mm-glass p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg">
          Add item
        </h2>
        <form action={addGalleryItem} className="space-y-4">
          <input name="title" required placeholder="Title" className={inputCls} />
          <input name="caption" placeholder="Caption" className={inputCls} />
          <input
            name="externalUrl"
            placeholder="External link (optional)"
            className={inputCls}
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            Add to gallery
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Items
        </h2>
        {gallery.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No gallery items yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {gallery.map((g) => (
              <li
                key={g.id}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span>
                  {g.title}
                  {g.caption && (
                    <span className="text-[var(--mm-text-dim)]"> — {g.caption}</span>
                  )}
                </span>
                <form action={removeGalleryItem}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-xs text-[var(--mm-danger)] hover:underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
