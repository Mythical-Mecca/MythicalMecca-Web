import { PageHeading } from "@/components/page-heading";
import { listCategories, type PartnerCategory } from "@/lib/categories";
import { createCategory, deleteCategory, updateCategory } from "../../../actions";
import { ConfirmButton } from "@/components/confirm-button";
import { listPartners } from "@/lib/partner";
import { TextField, TextareaField, CheckboxField, FormCard, FormSection } from "@/components/form";
import { PartnerTabs } from "@/components/partner-tabs";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export const metadata = { title: "Partner categories · Admin" };

const ACCENT = "#E18D01";

type ToggleKey = keyof Pick<
  PartnerCategory,
  | "requiresApplication"
  | "allowSelfManage"
  | "allowAdminManage"
  | "showProducts"
  | "showArt"
  | "showReviews"
  | "showSocials"
  | "showGallery"
  | "hasPremiumOption"
  | "featuredOnHome"
  | "active"
>;

const TOGGLES: { name: ToggleKey; label: string; icon: string; description: string }[] = [
  { name: "active", label: "Active", icon: "mdi:eye-outline", description: "Show this category publicly." },
  { name: "requiresApplication", label: "Requires application", icon: "mdi:file-document-outline", description: "Partners must apply to join." },
  { name: "allowSelfManage", label: "Self-manage", icon: "mdi:account-cog-outline", description: "Partners can edit their own profile." },
  { name: "allowAdminManage", label: "Admin-manage", icon: "mdi:shield-account-outline", description: "Admins can manage these partners." },
  { name: "showProducts", label: "Show products", icon: "mdi:package-variant", description: "Display products on profiles." },
  { name: "showArt", label: "Show art", icon: "mdi:palette-outline", description: "Display art on profiles." },
  { name: "showReviews", label: "Show reviews", icon: "mdi:star-outline", description: "Display testimonials." },
  { name: "showSocials", label: "Show socials", icon: "mdi:link-variant", description: "Display social links." },
  { name: "showGallery", label: "Show gallery", icon: "mdi:image-multiple-outline", description: "Display the gallery." },
  { name: "hasPremiumOption", label: "Premium option", icon: "mdi:crown-outline", description: "Allow premium upgrades." },
  { name: "featuredOnHome", label: "Featured on home", icon: "mdi:home-outline", description: "Surface on the homepage." },
];

/** The shared field set for both create and edit forms. */
function CategoryFields({ category }: { category?: PartnerCategory }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label="Name"
          icon="mdi:shape-outline"
          required
          defaultValue={category?.name ?? ""}
          placeholder="e.g. Vendors"
        />
        <TextField
          name="sort"
          label="Sort"
          type="number"
          icon="mdi:sort-numeric-ascending"
          hint="optional"
          defaultValue={category ? String(category.sort) : ""}
          placeholder="0"
        />
        <TextField
          name="icon"
          label="Icon"
          icon="mdi:emoticon-outline"
          hint="iconify name"
          defaultValue={category?.icon ?? ""}
          placeholder="game-icons:anvil"
        />
        <TextField
          name="color"
          label="Color"
          icon="mdi:palette-outline"
          hint="hex"
          defaultValue={category?.color ?? ""}
          placeholder="#E18D01"
        />
      </div>
      <TextareaField
        name="description"
        label="Description"
        hint="optional"
        icon="mdi:text-long"
        rows={2}
        defaultValue={category?.description ?? ""}
        placeholder="What this category is for…"
      />
      <FormSection title="Settings" icon="mdi:tune-variant">
        <div className="grid gap-3 sm:grid-cols-2">
          {TOGGLES.map((t) => (
            <CheckboxField
              key={t.name}
              name={t.name}
              icon={t.icon}
              label={t.label}
              description={t.description}
              defaultChecked={category ? category[t.name] : t.name === "active"}
            />
          ))}
        </div>
      </FormSection>
    </>
  );
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; deleted?: string }>;
}) {
  const categories = await listCategories();
  const { saved, error, deleted } = await searchParams;
  // How many stalls sit in each category — shown on the card, and what
  // decides whether the delete button is offered at all.
  const partners = await listPartners();
  const inUse = new Map<string, number>();
  for (const p of partners) {
    if (p.categoryId) inUse.set(p.categoryId, (inUse.get(p.categoryId) ?? 0) + 1);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeading
        size="md"
        title="Categories"
        subtitle="Partner categories & their settings."
        icon="mdi:shape-outline"
        accent={ACCENT}
      />

      <PartnerTabs active="/admin/partners/categories" />

      {saved && <Flash>Category saved.</Flash>}
      {deleted && <Flash>Category deleted.</Flash>}
      {error === "inuse" ? (
        <Flash tone="error">
          That category still has partners in it — move them first, then delete it.
        </Flash>
      ) : error ? (
        <Flash tone="error">Could not save — check inputs.</Flash>
      ) : null}

      <FormCard title="New category" icon="mdi:plus" accent={ACCENT}>
        <form action={createCategory} className="space-y-5">
          <CategoryFields />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Create category
          </button>
        </form>
      </FormCard>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:format-list-bulleted" width={20} className="text-[var(--mm-text-dim)]" />
          Existing{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({categories.length})
          </span>
        </h2>
        {categories.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <FormCard
              key={c.id}
              title={c.name}
              icon={c.icon ?? "mdi:shape-outline"}
              accent={c.color ?? ACCENT}
            >
              <form action={updateCategory} className="space-y-5">
                <input type="hidden" name="id" value={c.id} />
                <CategoryFields category={c} />
                <button type="submit" className="mm-btn mm-btn-primary">
                  <Icon icon="mdi:content-save" width={16} /> Save category
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mm-divider)] pt-4 text-sm text-[var(--mm-text-dim)]">
                <span>
                  {(inUse.get(c.id) ?? 0) === 0
                    ? "No partners in this category."
                    : `${inUse.get(c.id)} ${inUse.get(c.id) === 1 ? "partner" : "partners"} in this category.`}
                </span>
                {(inUse.get(c.id) ?? 0) === 0 && (
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton
                      label="Delete category"
                      confirmLabel="Delete it"
                      icon="mdi:trash-can-outline"
                      title={`Delete "${c.name}"?`}
                      body="It's empty, so nothing else is affected. There is no undo."
                      className="mm-btn mm-btn-ghost text-xs text-[var(--mm-danger)]"
                    />
                  </form>
                )}
              </div>
            </FormCard>
          ))
        )}
      </section>
    </div>
  );
}
