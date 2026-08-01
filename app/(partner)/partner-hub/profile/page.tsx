import { auth } from "@/lib/auth";
import { getMyPartner } from "@/lib/partner";
import { updateManufacturer } from "../../actions";
import { Flash } from "@/components/flash";
import { inputPill } from "@/components/form";

const inputCls = `w-full ${inputPill}`;

export default async function ForgeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  const partner = await getMyPartner(session!.user.id);
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Stall profile
      </h1>

      {saved && <Flash>Profile saved.</Flash>}
      {error && <Flash tone="error">Could not save.</Flash>}

      {!partner ? (
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
              value={partner.businessName}
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
              defaultValue={partner.tagline ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Bio
            </label>
            <textarea
              name="bio"
              defaultValue={partner.bio ?? ""}
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
              defaultValue={partner.socials?.raw ?? ""}
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
