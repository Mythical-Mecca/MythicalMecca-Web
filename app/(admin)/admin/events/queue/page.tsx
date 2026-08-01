import { listCommunityEventSubmissions } from "@/lib/admin";
import { approveCommunityEvent, rejectCommunityEvent } from "../../../actions-events";
import { PageHeader, inputCls } from "@/components/form";
import { EventAdminTabs } from "@/components/event-admin-tabs";
import { Tabs } from "@/components/tabs";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";
import { formatDateTime } from "@/lib/format";

const ACCENT = "#5cc08c";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "published", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

type Status = (typeof TABS)[number]["value"];

export default async function CommunityEventQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; done?: string; error?: string }>;
}) {
  const { status: statusRaw, done, error } = await searchParams;
  const status: Status = TABS.some((t) => t.value === statusRaw)
    ? (statusRaw as Status)
    : "pending";

  const items = await listCommunityEventSubmissions(status);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Community queue"
        sub="Member-submitted events — approve to publish on the calendar."
        icon="mdi:account-group-outline"
        accent={ACCENT}
      />

      <EventAdminTabs active="/admin/events/queue" />

      {done && <Flash>Verdict recorded.</Flash>}
      {error && <Flash tone="error">Action failed.</Flash>}

      <Tabs
        items={TABS.map((t) => ({
          href: `/admin/events/queue?status=${t.value}`,
          label: t.label,
        }))}
        active={`/admin/events/queue?status=${status}`}
        accent={ACCENT}
      />

      {items.length === 0 ? (
        <p className="text-sm text-[var(--mm-text-dim)]">
          No {status === "published" ? "approved" : status} submissions.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((e) => (
            <div key={e.id} className="mm-glass flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-[family-name:var(--font-display)] text-lg">
                  {e.title}
                </h3>
                <span className="shrink-0 text-xs text-[var(--mm-text-dim)]">
                  {e.createdAt}
                </span>
              </div>

              {e.summary && (
                <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
                  {e.summary}
                </p>
              )}
              {e.bodyMd && (
                <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs text-[var(--mm-text-dim)]">
                  {e.bodyMd}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--mm-text-dim)]">
                <span className="font-medium text-[var(--mm-text)]">
                  {e.submitterName}
                </span>
                {e.startsAt && (
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:clock-outline" width={13} />
                    {formatDateTime(e.startsAt)}
                  </span>
                )}
                {e.location && (
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:map-marker-outline" width={13} />
                    {e.location}
                  </span>
                )}
                {e.reviewNote && (
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:note-text-outline" width={13} />
                    {e.reviewNote}
                  </span>
                )}
              </div>

              {status === "pending" && (
                <div className="mt-4 space-y-3 border-t border-[var(--mm-border)] pt-4">
                  <form action={approveCommunityEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="mm-btn mm-btn-primary w-full text-xs">
                      <Icon icon="mdi:check" width={15} /> Approve &amp; publish
                    </button>
                  </form>
                  <form action={rejectCommunityEvent} className="flex gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      name="note"
                      placeholder="Reason (optional)"
                      className={`${inputCls} py-1.5 text-xs`}
                    />
                    <button className="mm-btn mm-btn-ghost shrink-0 text-xs">
                      <Icon icon="mdi:close" width={15} /> Reject
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
