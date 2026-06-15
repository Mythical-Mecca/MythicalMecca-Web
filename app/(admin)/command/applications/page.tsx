import { listApplications } from "@/lib/admin";
import { approveApplication, rejectApplication } from "../../actions";
import { PageHeader, inputCls } from "@/components/form";
import { Icon } from "@/components/icon";

const ACCENT = "#9a6cff";
const STATUS_COLOR: Record<string, string> = {
  pending: "var(--mm-gold)",
  approved: "var(--mm-live)",
  rejected: "var(--mm-danger)",
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const applications = await listApplications();
  const { done, error } = await searchParams;
  const pending = applications.filter((a) => a.status === "pending");
  const decided = applications.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Petitions"
        sub="Vendor applications — approve to grant Forge access."
        icon="mdi:file-document-outline"
        accent={ACCENT}
      />

      {done && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Verdict recorded.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Action failed.
        </div>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:inbox-outline" width={20} style={{ color: ACCENT }} />
          Pending <span className="text-sm text-[var(--mm-text-dim)]">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No pending petitions.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((a) => (
              <div key={a.id} className="mm-glass flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{a.businessName}</h3>
                  <span className="text-xs text-[var(--mm-text-dim)]">{a.createdAt}</span>
                </div>
                <p className="mt-2 flex-1 text-sm text-[var(--mm-text-dim)]">{a.pitch}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={approveApplication} className="flex flex-1 gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      name="note"
                      placeholder="Note (optional)"
                      className={`${inputCls} py-1.5 text-xs`}
                    />
                    <button className="mm-btn mm-btn-primary shrink-0 text-xs">
                      <Icon icon="mdi:check" width={15} /> Approve
                    </button>
                  </form>
                  <form action={rejectApplication}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      <Icon icon="mdi:close" width={15} /> Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
            Decided
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {decided.map((a) => (
              <div
                key={a.id}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span className="truncate">{a.businessName}</span>
                <span
                  className="shrink-0 text-xs uppercase tracking-widest"
                  style={{ color: STATUS_COLOR[a.status] }}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
