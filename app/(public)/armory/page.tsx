import Link from "next/link";
import { getVendors } from "@/lib/content";
import { DivisionBadge } from "@/components/content-ui";

export const metadata = { title: "The Armory — Mythic Mecha" };

export default async function ArmoryPage() {
  const vendors = await getVendors();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
            The <span className="mm-gradient-text">Armory</span>
          </h1>
          <p className="mt-3 max-w-xl text-[var(--mm-text-dim)]">
            Manufacturers from across the collective — makers, artists and shops
            showcasing their gear. Want a stall? Apply from your loadout.
          </p>
        </div>
        <Link href="/login" className="mm-btn mm-btn-ghost text-sm">
          Become a vendor
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <Link
            key={v.slug}
            href={`/armory/${v.slug}`}
            className="mm-glass group overflow-hidden p-0 transition hover:border-[var(--mm-violet)]"
          >
            <div
              className="h-36 w-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(47,75,224,0.5), rgba(124,58,237,0.5))",
              }}
            />
            <div className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <DivisionBadge division={v.division} />
                <span className="text-xs text-[var(--mm-text-dim)]">
                  {v.gallery.length} items
                </span>
              </div>
              <h2 className="font-medium group-hover:text-[var(--mm-gold)]">
                {v.businessName}
              </h2>
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                {v.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
