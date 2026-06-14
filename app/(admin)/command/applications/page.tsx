import { listApplications } from "@/lib/admin";
import { approveApplication, rejectApplication } from "../../actions";

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
    <div className="max-w-3xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Vendor applications
      </h1>

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
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No pending applications.
          </p>
        ) : (
          <ul className="space-y-4">
            {pending.map((a) => (
              <li key={a.id} className="mm-glass p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{a.businessName}</h3>
                  <span className="text-xs text-[var(--mm-text-dim)]">
                    {a.createdAt}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
                  {a.pitch}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={approveApplication} className="flex gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      name="note"
                      placeholder="Note (optional)"
                      className="rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-3 py-1.5 text-xs outline-none focus:border-[var(--mm-violet)]"
                    />
                    <button className="mm-btn mm-btn-primary text-xs">
                      Approve
                    </button>
                  </form>
                  <form action={rejectApplication}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
            Decided
          </h2>
          <ul className="space-y-2">
            {decided.map((a) => (
              <li
                key={a.id}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span>{a.businessName}</span>
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: STATUS_COLOR[a.status] }}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
