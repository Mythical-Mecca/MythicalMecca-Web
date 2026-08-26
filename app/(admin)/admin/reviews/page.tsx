import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { listReviewsForAdmin } from "@/lib/reviews";
import {
  approveReview,
  rejectReview,
  toggleFeaturedReview,
} from "../../actions";
import { inputCls, CheckboxField } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Tabs } from "@/components/tabs";
import { StarRating } from "@/components/star-rating";
import { Flash } from "@/components/flash";

export const metadata = { title: "Reviews · Admin" };

const ACCENT = "#5cc08c";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

type Status = (typeof TABS)[number]["value"];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; done?: string; error?: string }>;
}) {
  const { status: statusRaw, done, error } = await searchParams;
  const status: Status = TABS.some((t) => t.value === statusRaw)
    ? (statusRaw as Status)
    : "pending";

  const items = await listReviewsForAdmin(status);

  return (
    <div className="space-y-8">
      <PageHeading
        size="md"
        title="Reviews"
        subtitle="Moderate partner reviews."
        icon="mdi:message-star-outline"
        accent={ACCENT}
      />

      {done && <Flash>Done.</Flash>}
      {error && <Flash tone="error">Action failed.</Flash>}

      <Tabs
        items={TABS.map((t) => ({
          href: `/admin/reviews?status=${t.value}`,
          label: t.label,
        }))}
        active={`/admin/reviews?status=${status}`}
        accent={ACCENT}
      />

      {items.length === 0 ? (
        <p className="text-sm text-[var(--mm-text-dim)]">
          No {status} reviews.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((r) => (
            <div key={r.id} className="mm-glass flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <StarRating value={r.rating} width={18} />
                <span className="shrink-0 text-xs text-[var(--mm-text-dim)]">
                  {r.createdAt}
                </span>
              </div>

              {r.body && (
                <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
                  “{r.body}”
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--mm-text-dim)]">
                <span className="font-medium text-[var(--mm-text)]">
                  {r.authorName}
                </span>
                {r.isAnonymous && (
                  <Badge icon="mdi:incognito">Anonymous</Badge>
                )}
                <span className="text-[var(--mm-border)]">·</span>
                {r.targetType === "partner" && r.partnerSlug ? (
                  <Link
                    href={`/partners/${r.partnerSlug}`}
                    className="inline-flex items-center gap-1 text-[var(--mm-gold)] hover:underline"
                  >
                    <Icon icon="game-icons:anvil" width={12} />
                    {r.partnerName ?? "Partner"}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Icon icon="mdi:web" width={12} /> Site
                  </span>
                )}
                {r.featured && (
                  <Badge color={ACCENT} icon="mdi:star">
                    Featured
                  </Badge>
                )}
              </div>

              {/* Actions */}
              {status === "pending" && (
                <div className="mt-4 space-y-3 border-t border-[var(--mm-border)] pt-4">
                  <form action={approveReview} className="space-y-3">
                    <input type="hidden" name="id" value={r.id} />
                    <CheckboxField
                      label="Feature on homepage"
                      icon="mdi:star"
                      name="featured"
                      value="1"
                    />
                    <button className="mm-btn mm-btn-primary w-full text-xs">
                      <Icon icon="mdi:check" width={15} /> Approve
                    </button>
                  </form>
                  <form action={rejectReview} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="note"
                      aria-label="Reason for rejecting this review"
                      placeholder="Reason (optional)"
                      className={`${inputCls} py-1.5 text-xs`}
                    />
                    <button className="mm-btn mm-btn-ghost shrink-0 text-xs">
                      <Icon icon="mdi:close" width={15} /> Reject
                    </button>
                  </form>
                </div>
              )}

              {status === "approved" && (
                <div className="mt-4 border-t border-[var(--mm-border)] pt-4">
                  <form action={toggleFeaturedReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="featured"
                      value={r.featured ? "0" : "1"}
                    />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      <Icon
                        icon={r.featured ? "mdi:star-off" : "mdi:star"}
                        width={15}
                      />
                      {r.featured ? "Unfeature" : "Feature on homepage"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
