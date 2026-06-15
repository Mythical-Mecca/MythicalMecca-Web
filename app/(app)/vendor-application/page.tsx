import { auth } from "@/lib/auth";
import { getMyApplication } from "@/lib/member";
import { VendorApplicationForm } from "@/components/vendor-application-form";
import { PageHeader } from "@/components/form";
import { Icon } from "@/components/icon";

const STATUS: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: "var(--mm-gold)", icon: "mdi:clock-outline", label: "Pending" },
  approved: { color: "var(--mm-live)", icon: "mdi:check-circle-outline", label: "Approved" },
  rejected: { color: "var(--mm-danger)", icon: "mdi:close-circle-outline", label: "Rejected" },
};

export default async function VendorApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const application = await getMyApplication(user.id);
  const { sent } = await searchParams;
  const isVendor = user.role === "vendor" || user.role === "admin";

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Vendor application"
        sub="Apply for a stall in the Armory — show us what you make."
        icon="game-icons:shop"
        accent="#9a6cff"
      />

      {isVendor && (
        <div className="mm-glass flex items-center gap-2 border-[var(--mm-live)] p-4 text-sm text-[var(--mm-live)]">
          <Icon icon="mdi:check-circle-outline" width={18} />
          You already have Forge access — manage your stall from the Forge.
        </div>
      )}

      {sent && (
        <div className="mm-glass flex items-center gap-2 border-[var(--mm-live)] p-4 text-sm text-[var(--mm-live)]">
          <Icon icon="mdi:send-check-outline" width={18} />
          Petition sent to the Keep. Track its status below.
        </div>
      )}

      {application && (
        <section className="mm-glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {application.businessName || "Your application"}
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest"
              style={{
                color: STATUS[application.status].color,
                border: `1px solid ${STATUS[application.status].color}`,
              }}
            >
              <Icon icon={STATUS[application.status].icon} width={14} />
              {STATUS[application.status].label}
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
            {application.pitch}
          </p>
          {application.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {application.images.map((src) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-square w-full rounded-lg border border-[var(--mm-border)] object-cover"
                />
              ))}
            </div>
          )}
          {application.reviewNote && (
            <p className="mt-4 text-sm">
              <span className="text-[var(--mm-text-dim)]">Note from the Keep: </span>
              {application.reviewNote}
            </p>
          )}
        </section>
      )}

      {!isVendor && application?.status !== "pending" && (
        <section>
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-lg tracking-wide">
            {application ? "Re-apply" : "Apply"}
          </h2>
          <VendorApplicationForm />
        </section>
      )}

      {application?.status === "pending" && (
        <p className="text-sm text-[var(--mm-text-dim)]">
          Your petition is under review at the Keep. You&apos;ll be notified when
          the verdict lands.
        </p>
      )}
    </div>
  );
}
