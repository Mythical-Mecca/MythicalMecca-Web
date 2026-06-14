import { auth } from "@/lib/auth";
import { getMyApplication } from "@/lib/member";
import { submitVendorApplication } from "../actions";

const STATUS_STYLE: Record<string, string> = {
  pending: "var(--mm-gold)",
  approved: "var(--mm-live)",
  rejected: "var(--mm-danger)",
};

export default async function VendorApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const application = await getMyApplication(user.id);
  const { sent, error } = await searchParams;

  // Already a vendor or above — no need to apply.
  const isVendor = user.role === "vendor" || user.role === "admin";

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
        Vendor <span className="mm-gradient-text">application</span>
      </h1>

      {isVendor && (
        <div className="mm-glass border-[var(--mm-live)] p-4 text-sm text-[var(--mm-live)]">
          You already have Forge access. Head to the Forge to manage your
          stall.
        </div>
      )}

      {sent && (
        <div className="mm-glass border-[var(--mm-live)] p-4 text-sm text-[var(--mm-live)]">
          Petition sent to the Keep. Track its status below.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-4 text-sm text-[var(--mm-danger)]">
          Submission failed — check your inputs and try again.
        </div>
      )}

      {application && (
        <section className="mm-glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {application.businessName}
            </h2>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest"
              style={{
                color: STATUS_STYLE[application.status],
                border: `1px solid ${STATUS_STYLE[application.status]}`,
              }}
            >
              {application.status}
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
            {application.pitch}
          </p>
          {application.reviewNote && (
            <p className="mt-3 text-sm">
              <span className="text-[var(--mm-text-dim)]">Command note: </span>
              {application.reviewNote}
            </p>
          )}
        </section>
      )}

      {!isVendor && application?.status !== "pending" && (
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg tracking-wide">
            {application ? "Re-apply" : "Apply"}
          </h2>
          <form action={submitVendorApplication} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
                Business / studio name
              </label>
              <input
                name="businessName"
                required
                className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
                Your pitch
              </label>
              <textarea
                name="pitch"
                required
                rows={5}
                placeholder="What do you make? What would you sell in the Armory?"
                className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--mm-violet)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
                Socials (links, comma separated)
              </label>
              <input
                name="socials"
                className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
              />
            </div>
            <button type="submit" className="mm-btn mm-btn-primary">
              Submit
            </button>
          </form>
        </section>
      )}

      {application?.status === "pending" && (
        <p className="text-sm text-[var(--mm-text-dim)]">
          Your petition is under review at the Keep. You&apos;ll be notified
          when the verdict lands.
        </p>
      )}
    </div>
  );
}
