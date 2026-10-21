import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMyPartners } from "@/lib/partner-access";
import { listSelfManageCategories } from "@/lib/categories";
import { roleAtLeast } from "@/lib/rbac";
import { createPartnerPage } from "../../actions";
import { TextField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export const metadata = { title: "New stall · Partner Hub" };

const ERRORS: Record<string, string> = {
  limit: "You've reached the maximum number of stalls on one account.",
  category: "That category isn't open for self-managed stalls.",
  "1": "Could not create the stall — check the name and category.",
};

export default async function NewStallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const [mine, categories] = await Promise.all([
    listMyPartners(session!.user.id),
    listSelfManageCategories(),
  ]);
  const { error } = await searchParams;

  // Opening another stall is a privilege of already running an approved one.
  // Re-checked in the action; this is just so nobody stares at a dead form.
  const isAdmin = roleAtLeast(session!.user.role, "admin");
  const isPartner = roleAtLeast(session!.user.role, "partner");
  if (!isAdmin && !isPartner && mine.length === 0) redirect("/apply");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeading
        size="md"
        title="New stall"
        subtitle="Set it up at your own pace — it stays private until you submit it."
        icon="mdi:plus-circle-outline"
        accent="#5cc08c"
      />

      {error && <Flash tone="error">{ERRORS[error] ?? ERRORS["1"]}</Flash>}

      {categories.length === 0 ? (
        <div className="mm-glass border-[var(--mm-gold)] p-6 text-sm text-[var(--mm-text-dim)]">
          No categories are open for self-managed stalls right now. Ask an admin
          to enable one.
        </div>
      ) : (
        <FormCard title="Stall details" icon="game-icons:shop" accent="#5cc08c">
          <form action={createPartnerPage} className="space-y-5">
            <TextField
              name="businessName"
              label="Business name"
              icon="mdi:storefront-outline"
              required
              placeholder="e.g. The Iron Coast Forge"
              description="You can change this while the stall is still a draft."
            />
            <PickerField
              name="categoryId"
              label="Category"
              icon="mdi:shape-outline"
              description="Decides how your page is laid out and where it appears."
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                hint: c.description ?? undefined,
              }))}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:plus" width={16} /> Create draft
              </button>
              <Link href="/partner-hub" className="mm-btn mm-btn-ghost">
                Cancel
              </Link>
            </div>
          </form>
        </FormCard>
      )}
    </div>
  );
}
