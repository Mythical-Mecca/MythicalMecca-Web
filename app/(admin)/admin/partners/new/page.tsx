import { PageHeading } from "@/components/page-heading";
import { listCategories } from "@/lib/categories";
import { createPartner } from "../../../actions";
import { TextField, TextareaField, CheckboxField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export const metadata = { title: "New partner · Admin" };

const ACCENT = "#E18D01";

export default async function NewPartnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const categories = await listCategories();
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeading
        size="md"
        title="Add partner"
        subtitle="Create a partner page in any category."
        icon="mdi:account-plus-outline"
        accent={ACCENT}
      />

      {error && <Flash tone="error">Could not create — check inputs.</Flash>}

      <FormCard title="New partner" icon="mdi:plus" accent={ACCENT}>
        <form action={createPartner} className="space-y-5">
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
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <TextField
            name="tagline"
            label="Tagline"
            hint="optional"
            icon="mdi:text-short"
            placeholder="One-line description"
          />
          <TextareaField
            name="bio"
            label="Bio"
            hint="optional"
            icon="mdi:text-long"
            rows={5}
            placeholder="Tell their story…"
          />
          <TextareaField
            name="socials"
            label="Socials"
            hint="one per line or freeform"
            icon="mdi:link-variant"
            rows={3}
            placeholder="instagram: @handle&#10;https://example.com"
          />
          <CheckboxField
            name="isPremium"
            icon="mdi:crown"
            label="Premium partner"
            description="Highlight this partner across the armory."
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Create partner
          </button>
        </form>
      </FormCard>
    </div>
  );
}
