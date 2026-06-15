import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendor, getVendors } from "@/lib/content";

export async function generateStaticParams() {
  const vendors = await getVendors();
  return vendors.map((v) => ({ slug: v.slug }));
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = await getVendor(slug);
  if (!vendor) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/armory"
        className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        ← The Armory
      </Link>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">
            {vendor.businessName}
          </h1>
          <p className="mt-2 text-lg text-[var(--mm-text-dim)]">
            {vendor.tagline}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vendor.socials.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-btn mm-btn-ghost text-sm"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-[var(--mm-text-dim)]">{vendor.bio}</p>

      <h2 className="mt-12 font-[family-name:var(--font-display)] text-xl tracking-wide">
        Gallery
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vendor.gallery.map((g, i) => (
          <div key={i} className="mm-glass overflow-hidden p-0">
            <div
              className="h-40 w-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.45), rgba(245,196,81,0.35))",
              }}
            />
            <div className="p-4">
              <p className="font-medium">{g.title}</p>
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                {g.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-[var(--mm-text-dim)]">
        Trade comes later — for now, reach this artisan via the links above.
      </p>
    </div>
  );
}
