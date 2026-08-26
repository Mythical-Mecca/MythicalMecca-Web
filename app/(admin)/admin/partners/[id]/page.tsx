import { PageHeading } from "@/components/page-heading";
import { notFound } from "next/navigation";
import { getPartnerById } from "@/lib/partner";
import { listCategories } from "@/lib/categories";
import { updatePartner } from "../../../actions";
import { TextField, TextareaField, CheckboxField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await getPartnerById(id);
  return { title: `${partner?.businessName ?? "Partner"} · Admin` };
}

const ACCENT = "#E18D01";

export default async function EditPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const [partner, categories] = await Promise.all([
    getPartnerById(id),
    listCategories(),
  ]);
  if (!partner) notFound();
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeading
        size="md"
        title="Edit partner"
        subtitle={partner.businessName}
        icon="mdi:account-edit-outline"
        accent={ACCENT}
      />

      {error && <Flash tone="error">Could not save — check inputs.</Flash>}

      <FormCard title="Partner details" icon="mdi:pencil" accent={ACCENT}>
        <form action={updatePartner} className="space-y-5">
          <input type="hidden" name="id" value={partner.id} />
          <TextField
            name="businessName"
            label="Business name"
            icon="mdi:storefront-outline"
            required
            defaultValue={partner.businessName}
          />
          <PickerField
            name="categoryId"
            label="Category"
            icon="mdi:shape-outline"
            hint="optional"
            placeholder="No category"
            defaultValue={partner.categoryId ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <TextField
            name="tagline"
            label="Tagline"
            hint="optional"
            icon="mdi:text-short"
            defaultValue={partner.tagline ?? ""}
          />
          <TextareaField
            name="bio"
            label="Bio"
            hint="optional"
            icon="mdi:text-long"
            rows={5}
            defaultValue={partner.bio ?? ""}
          />
          <TextareaField
            name="socials"
            label="Socials"
            hint="one per line or freeform"
            icon="mdi:link-variant"
            rows={3}
            defaultValue={partner.socialsRaw ?? ""}
          />
          <CheckboxField
            name="isPremium"
            icon="mdi:crown"
            label="Premium partner"
            description="Highlight this partner across the armory."
            defaultChecked={partner.isPremium}
          />
          <CheckboxField
            name="active"
            icon="mdi:eye-outline"
            label="Active"
            description="Show this partner publicly in the armory."
            defaultChecked={partner.active}
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:content-save" width={16} /> Save changes
          </button>
        </form>
      </FormCard>
    </div>
  );
}
