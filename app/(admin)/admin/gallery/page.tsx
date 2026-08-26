import { PageHeading } from "@/components/page-heading";
import { listGallery } from "@/lib/admin";
import { GalleryTable } from "@/components/gallery-table";
import { Flash } from "@/components/flash";
import { ACCENT } from "@/lib/accents";

export const metadata = { title: "Gallery · Admin" };

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const items = await listGallery();
  const { saved, error } = await searchParams;
  const views = items.reduce((n, i) => n + i.views, 0);
  const uniqueViews = items.reduce((n, i) => n + i.uniqueViews, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeading
        size="md"
        title="Gallery"
        subtitle="Community photos shown on the public homepage."
        icon="mdi:image-multiple-outline"
        accent={ACCENT.gallery}
      />

      {saved && <Flash>Gallery updated.</Flash>}
      {error && (
        <Flash tone="error">Could not update — add at least one image.</Flash>
      )}

      <section className="space-y-3">
        <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-[family-name:var(--font-display)] text-lg">
          Photos{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({items.length})
          </span>
          {items.length > 0 && (
            <span className="text-sm font-normal text-[var(--mm-text-dim)]">
              {views.toLocaleString()} view{views === 1 ? "" : "s"} ·{" "}
              {uniqueViews.toLocaleString()} unique
            </span>
          )}
        </h2>
        <GalleryTable items={items} />
      </section>
    </div>
  );
}
