import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { listPartners } from "@/lib/partner";
import { setPartnerPremium, setPartnerActive } from "../../actions";

import { PartnerTabs } from "@/components/partner-tabs";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";

export const metadata = { title: "Partners · Admin" };

const ACCENT = "#E18D01";

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const partners = await listPartners();
  const { saved, error } = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeading
        size="md"
        title="Partners"
        subtitle="Every partner in the armory, across all categories."
        icon="game-icons:anvil"
        accent={ACCENT}
        actions={
          <Link href="/admin/partners/new" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Add partner
          </Link>
        }
      />

      <PartnerTabs active="/admin/partners" />

      {saved && <Flash>Partner updated.</Flash>}
      {error && <Flash tone="error">Could not update — check inputs.</Flash>}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:storefront-outline" width={20} style={{ color: ACCENT }} />
          All partners{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({partners.length})
          </span>
        </h2>
        {partners.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No partners yet.</p>
        ) : (
          <div className="space-y-2">
            {partners.map((p) => (
              <div
                key={p.id}
                className="mm-glass flex flex-wrap items-center gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.businessName}</span>
                    {p.isPremium && (
                      <Badge color="var(--mm-gold)" icon="mdi:crown">
                        Premium
                      </Badge>
                    )}
                    <span
                      className="text-[11px] uppercase tracking-widest"
                      style={{
                        color: p.active
                          ? "var(--mm-live)"
                          : "var(--mm-text-dim)",
                      }}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--mm-text-dim)]">
                    {p.categoryName ?? "Uncategorized"} · {p.createdAt}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/partners/${p.id}`}
                    className="mm-btn mm-btn-ghost text-xs"
                  >
                    <Icon icon="mdi:pencil" width={14} /> Edit
                  </Link>
                  <form action={setPartnerPremium}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="premium"
                      value={p.isPremium ? "0" : "1"}
                    />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      <Icon icon="mdi:crown-outline" width={14} />
                      {p.isPremium ? "Unmake premium" : "Make premium"}
                    </button>
                  </form>
                  <form action={setPartnerActive}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={p.active ? "0" : "1"}
                    />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      <Icon
                        icon={p.active ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                        width={14}
                      />
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
