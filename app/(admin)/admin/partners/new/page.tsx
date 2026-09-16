import { PageHeading } from "@/components/page-heading";
import { listCategories } from "@/lib/categories";
import { createPartner } from "@/app/(admin)/actions-partners";
import {
  TextField,
  TextareaField,
  CheckboxField,
  FormCard,
  FormSection,
} from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { ImageUploader } from "@/components/image-uploader";
import { BackLink } from "@/components/back-link";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export const metadata = { title: "New partner · Admin" };

const ACCENT = "#E18D01";

/**
 * Add a partner by hand — a stall we list on their behalf, or one being set
 * up ahead of the owner getting an account. Created approved and listed,
 * because an admin doing this is the review.
 */
export default async function NewPartnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [categories, { error }] = await Promise.all([
    listCategories(),
    searchParams,
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <BackLink to={{ href: "/admin/partners", label: "All partners" }} />
      <PageHeading
        size="md"
        title="Add partner"
        subtitle="Goes live as soon as it's saved. Everything here can be changed later."
        icon="mdi:storefront-plus-outline"
        accent={ACCENT}
      />

      {error && (
        <Flash tone="error">
          Could not create — the name needs at least two characters, links must
          be http(s), and the owner email must be a real address.
        </Flash>
      )}

      <FormCard title="New partner" icon="mdi:plus" accent={ACCENT}>
        <form action={createPartner} className="space-y-6">
          <FormSection title="The stall" icon="game-icons:anvil">
            <TextField
              name="businessName"
              label="Business name"
              icon="mdi:storefront-outline"
              required
              placeholder="e.g. The Iron Coast Forge"
            />
            <PickerField
              name="categoryId"
              label="Category"
              icon="mdi:shape-outline"
              hint="optional"
              placeholder="No category"
              description="Decides which sections the public page shows."
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                icon: c.icon ?? undefined,
              }))}
            />
            <TextField
              name="tagline"
              label="Tagline"
              hint="optional"
              icon="mdi:text-short"
              maxLength={200}
              placeholder="One line under the name"
            />
            <TextareaField
              name="bio"
              label="Bio"
              hint="optional"
              icon="mdi:text-long"
              rows={5}
              maxLength={2000}
              placeholder="Their story, in their words."
            />
          </FormSection>

          <FormSection title="Links" icon="mdi:link-variant">
            <TextField
              name="shopUrl"
              label="Shop link"
              hint="optional"
              icon="mdi:cart-outline"
              type="url"
              inputMode="url"
              placeholder="https://…"
              description="Where the public page sends people to buy."
            />
            <TextareaField
              name="socials"
              label="Socials"
              hint="optional · one per line"
              icon="mdi:share-variant-outline"
              rows={3}
              placeholder={"https://instagram.com/…\nhttps://facebook.com/…"}
            />
          </FormSection>

          <FormSection title="Images" icon="mdi:image-outline">
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageUploader
                name="logo"
                entityType="partner_gallery"
                maxFiles={1}
                accent={ACCENT}
                label="Logo"
                description="Square works best"
              />
              <ImageUploader
                name="banner"
                entityType="partner_gallery"
                maxFiles={1}
                accent={ACCENT}
                label="Banner"
                description="Wide, behind the name"
              />
            </div>
          </FormSection>

          <FormSection title="Who runs it" icon="mdi:account-key-outline">
            <TextField
              name="ownerEmail"
              label="Owner's email"
              hint="optional"
              icon="mdi:email-outline"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="owner@example.com"
              description="An existing account becomes the owner straight away. Anyone else gets an owner invitation — you'll be shown the link to pass on. Leave empty for a stall nobody manages yet."
            />
          </FormSection>

          <FormSection title="Visibility" icon="mdi:eye-outline">
            <CheckboxField
              name="isPremium"
              icon="mdi:crown-outline"
              label="Premium partner"
              description="Highlighted across the armory."
            />
            <CheckboxField
              name="active"
              value="1"
              icon="mdi:eye-outline"
              label="Listed"
              defaultChecked
              description="Untick to create it hidden and list it later."
            />
            {/* A checkbox that is off submits nothing; this makes "unlisted"
                an explicit value the action can read. */}
            <input type="hidden" name="active" value="0" />
          </FormSection>

          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Create partner
          </button>
        </form>
      </FormCard>
    </div>
  );
}
