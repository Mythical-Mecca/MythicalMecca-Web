import { auth } from "@/lib/auth";
import { getMyVendor } from "@/lib/vendor";
import { updateManufacturer } from "../../actions";

const inputCls =
  "w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]";

export default async function ForgeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  const vendor = await getMyVendor(session!.user.id);
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Stall profile
      </h1>

      {saved && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Profile saved.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not save.
        </div>
      )}

      {!vendor ? (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm text-[var(--mm-text-dim)]">
          No stall to edit yet.
        </div>
      ) : (
        <form action={updateManufacturer} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Business name
            </label>
            <input
              value={vendor.businessName}
              disabled
              className={`${inputCls} opacity-60`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Tagline
            </label>
            <input
              name="tagline"
              defaultValue={vendor.tagline ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Bio
            </label>
            <textarea
              name="bio"
              defaultValue={vendor.bio ?? ""}
              rows={5}
              className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--mm-violet)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Socials (links, comma separated)
            </label>
            <input
              name="socials"
              defaultValue={vendor.socials?.raw ?? ""}
              className={inputCls}
            />
          </div>
          <button type="submit" className="mm-btn mm-btn-primary">
            Save profile
          </button>
        </form>
      )}
    </div>
  );
}
