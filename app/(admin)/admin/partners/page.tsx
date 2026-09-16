import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { listPartners } from "@/lib/partner";
import { listCategories } from "@/lib/categories";
import { PartnersTable } from "@/components/partners-table";
import { PartnerTabs } from "@/components/partner-tabs";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export const metadata = { title: "Partners · Admin" };

const ACCENT = "#E18D01";

/**
 * Every partner, in one editable table.
 *
 * Status and listing are the two switches that decide whether a page is
 * public, and they are both in the table so the reader never has to open a
 * partner to find out why it isn't showing. Everything with more than one
 * field to it — images, products, the team — is on the partner's own page.
 */
export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; deleted?: string }>;
}) {
  const [partners, categories, sp] = await Promise.all([
    listPartners(),
    listCategories(),
    searchParams,
  ]);
  const pending = partners.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-8">
      <PageHeading
        size="md"
        title="Partners"
        subtitle="Every stall in the armory, across all categories."
        icon="game-icons:anvil"
        accent={ACCENT}
        actions={
          <Link href="/admin/partners/new" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Add partner
          </Link>
        }
      />

      <PartnerTabs active="/admin/partners" />

      {sp.saved && <Flash>Partner saved.</Flash>}
      {sp.deleted && <Flash>Partner deleted.</Flash>}
      {sp.error && <Flash tone="error">Could not update — check inputs.</Flash>}

      {pending > 0 && (
        <div className="mm-glass flex flex-wrap items-center justify-between gap-3 border-[var(--mm-gold)] p-4 text-sm">
          <span className="flex items-center gap-2">
            <Icon icon="mdi:clock-outline" width={18} className="text-[var(--mm-gold)]" />
            {pending} {pending === 1 ? "stall is" : "stalls are"} waiting for
            review.
          </span>
          <Link href="/admin/partners/queue" className="mm-btn mm-btn-ghost text-xs">
            <Icon icon="mdi:gavel" width={14} /> Open the queue
          </Link>
        </div>
      )}

      <PartnersTable
        partners={partners}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
