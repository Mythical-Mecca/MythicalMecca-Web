import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyVendor, listMyGallery } from "@/lib/vendor";

export default async function ForgeOverviewPage() {
  const session = await auth();
  const vendor = await getMyVendor(session!.user.id);
  const gallery = vendor ? await listMyGallery(vendor.id) : [];

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        The <span className="mm-gradient-text">Forge</span>
      </h1>

      {!vendor ? (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm text-[var(--mm-text-dim)]">
          No stall loaded yet. Once a database is connected and your petition is
          approved, your Forge fills in here.
        </div>
      ) : (
        <>
          <div className="mm-glass p-6">
            <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
              Stall
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl">
              {vendor.businessName}
            </h2>
            <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
              {vendor.tagline ?? "Add a tagline in your profile."}
            </p>
            <Link
              href={`/armory/${vendor.slug}`}
              className="mt-4 inline-block text-sm text-[var(--mm-gold)] hover:text-[var(--mm-gold-hi)]"
            >
              View public page →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/forge/gallery" className="mm-glass p-5">
              <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                Gallery items
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
                {gallery.length}
              </p>
            </Link>
            <Link href="/forge/profile" className="mm-glass p-5">
              <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                Stall profile
              </p>
              <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
                Edit tagline, bio & socials →
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
