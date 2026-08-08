import Link from "next/link";
import { requirePartnerAccess } from "@/lib/partner-access";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { PartnerStatusBadge } from "@/components/partner-status-badge";
import { PartnerHubTabs } from "@/components/partner-hub-tabs";

/**
 * Stall-scoped chrome. `requirePartnerAccess` here is a UX guard only — Next
 * does not re-run layouts for server actions, so each action in
 * app/(partner)/actions.ts authorizes independently.
 */
export default async function PartnerStallLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const { membership } = await requirePartnerAccess(partnerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/partner-hub"
            className="inline-flex items-center gap-1 text-xs text-[var(--mm-text-dim)] transition hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:chevron-left" width={14} /> All stalls
          </Link>
          <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-2xl tracking-wide">
            {membership.businessName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PartnerStatusBadge status={membership.status} />
            {membership.viaAdmin && (
              <Badge color="var(--mm-gold)" icon="game-icons:tower-flag">
                Admin view
              </Badge>
            )}
            {!membership.active && (
              <Badge color="var(--mm-danger)" icon="mdi:pause-circle-outline">
                Paused
              </Badge>
            )}
          </div>
        </div>
        <Link
          href={
            membership.status === "approved"
              ? `/partners/${membership.slug}`
              : `/partners/${membership.slug}?preview=1`
          }
          className="mm-btn mm-btn-ghost shrink-0 text-sm"
        >
          <Icon icon="mdi:open-in-new" width={16} />
          {membership.status === "approved" ? "View public page" : "Preview"}
        </Link>
      </div>

      <PartnerHubTabs partnerId={partnerId} />

      {children}
    </div>
  );
}
