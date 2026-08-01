import { listApplications } from "@/lib/admin";
import { approveApplication, rejectApplication } from "../../../actions";
import { PageHeader, inputCls } from "@/components/form";
import { PartnerTabs } from "@/components/partner-tabs";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

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
        title="Applications"
        sub="Partner applications — approve to grant Partner Hub access."
        icon="mdi:file-document-outline"
        accent={ACCENT}
      />

      <PartnerTabs active="/admin/partners/applications" />

      {done && <Flash>Verdict recorded.</Flash>}
      {error && <Flash tone="error">Action failed.</Flash>}

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
                  <h3 className="font-medium">
                    {a.businessName || "Unnamed stall"}
                  </h3>
                  <span className="text-xs text-[var(--mm-text-dim)]">{a.createdAt}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--mm-text-dim)]">{a.pitch}</p>
                {a.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {a.images.slice(0, 8).map((src) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="aspect-square w-full rounded-md border border-[var(--mm-border)] object-cover"
                      />
                    ))}
                  </div>
                )}
                {Object.keys(a.socials).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(a.socials).map(([k, v]) => (
                      <a
                        key={k}
                        href={v.startsWith("http") ? v : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--mm-border)] px-2.5 py-1 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
                      >
                        <Icon
                          icon={
                            k === "instagram"
                              ? "mdi:instagram"
                              : k === "youtube"
                                ? "mdi:youtube"
                                : k === "tiktok"
                                  ? "ic:baseline-tiktok"
                                  : k === "x"
                                    ? "mdi:alpha-x-box"
                                    : "mdi:web"
                          }
                          width={13}
                        />
                        {v}
                      </a>
                    ))}
                  </div>
                )}
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
