import { notFound } from "next/navigation";
import { getPartnerForHub } from "@/lib/partner";
import { updatePartnerProfile } from "../../../actions";
import { Flash } from "@/components/flash";
import { ImageUploader } from "@/components/image-uploader";
import { inputPill } from "@/components/form";

const inputCls = `w-full ${inputPill}`;

export default async function StallProfilePage({
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
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-6">
      {saved && <Flash>Profile saved.</Flash>}
      {error && <Flash tone="error">Could not save.</Flash>}

      <form action={updatePartnerProfile} className="space-y-5">
        <input type="hidden" name="partnerId" value={partner.id} />
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
            Shop or website link
          </label>
          <input
            name="shopUrl"
            type="url"
            defaultValue={partner.shopUrl ?? ""}
            placeholder="https://yourshop.example"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
            Socials (links, comma separated)
          </label>
          <input
            name="socials"
            defaultValue={partner.socialsText}
            className={inputCls}
          />
          <p className="mt-1.5 text-xs text-[var(--mm-text-dim)]">
            Instagram, YouTube, TikTok, X, Facebook, Discord and Etsy links are
            recognised automatically and shown with their icon.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {partner.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={partner.logoUrl}
                alt=""
                className="mb-2 h-20 w-20 rounded-xl border border-[var(--mm-border)] object-cover"
              />
            )}
            <ImageUploader
              name="logo"
              entityType="partner_gallery"
              maxFiles={1}
              accent="#E18D01"
              label={partner.logoUrl ? "Replace logo" : "Upload a logo"}
              description="Square works best"
            />
          </div>
          <div>
            {partner.bannerUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={partner.bannerUrl}
                alt=""
                className="mb-2 h-20 w-full rounded-xl border border-[var(--mm-border)] object-cover"
              />
            )}
            <ImageUploader
              name="banner"
              entityType="partner_gallery"
              maxFiles={1}
              accent="#E18D01"
              label={partner.bannerUrl ? "Replace banner" : "Upload a banner"}
              description="Wide image for the top of your page"
            />
          </div>
        </div>

        <button type="submit" className="mm-btn mm-btn-primary">
          Save profile
        </button>
      </form>
    </div>
  );
}
