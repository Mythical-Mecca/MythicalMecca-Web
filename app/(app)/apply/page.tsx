import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyApplication } from "@/lib/member";
import { listApplicableCategories } from "@/lib/categories";
import {
  ApplicationDetailsForm,
  ApplicationImagesForm,
} from "@/components/partner-application-wizard";

import { Icon } from "@/components/icon";

export const metadata = { title: "Partner application" };

const STATUS: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: "var(--mm-gold)", icon: "mdi:clock-outline", label: "Pending" },
  approved: { color: "var(--mm-live)", icon: "mdi:check-circle-outline", label: "Approved" },
  rejected: { color: "var(--mm-danger)", icon: "mdi:close-circle-outline", label: "Rejected" },
};

function Stepper({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Details" },
    { n: 2, label: "Demo images" },
  ];
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
              step === s.n
                ? "border-[var(--mm-gold)] text-[var(--mm-gold)]"
                : step > s.n
                  ? "border-[var(--mm-live)] text-[var(--mm-live)]"
                  : "border-[var(--mm-border)] text-[var(--mm-text-dim)]"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs">
              {step > s.n ? <Icon icon="mdi:check" width={12} /> : s.n}
            </span>
            {s.label}
          </span>
          {i === 0 && <span className="h-px w-6 bg-[var(--mm-border)]" />}
        </div>
      ))}
    </div>
  );
}

export default async function PartnerApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; step?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const application = await getMyApplication(user.id);
  const categories = await listApplicableCategories();
  const { sent, step } = await searchParams;
  const isPartner = user.role === "partner" || user.role === "admin";

  const draft = application?.status === "draft" ? application : null;
  // Step 1 unless we have a started draft (and aren't explicitly editing details).
  const currentStep: 1 | 2 = draft && step !== "1" ? 2 : 1;

  const canApply =
    !isPartner &&
    (!application ||
      application.status === "draft" ||
      application.status === "rejected");

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeading
        size="md"
        title="Partner application"
        subtitle="Apply for a stall in the Armory — show us what you make."
        icon="game-icons:shop"
        accent="#9a6cff"
      />

      {isPartner && (
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

      {/* Submitted / reviewed application summary */}
      {application && application.status !== "draft" && (
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

      {application?.status === "pending" && (
        <p className="text-sm text-[var(--mm-text-dim)]">
          Your petition is under review at the Keep. You&apos;ll be notified when
          the verdict lands.
        </p>
      )}

      {/* Wizard */}
      {canApply && (
        <section className="space-y-6">
          <Stepper step={currentStep} />

          {currentStep === 1 ? (
            <div>
              <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg tracking-wide">
                Step 1 · Your stall
              </h2>
              <p className="mb-5 text-sm text-[var(--mm-text-dim)]">
                Tell us about your products. We&apos;ll save this, then you can
                add demo images.
              </p>
              <ApplicationDetailsForm
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                defaults={
                  draft
                    ? {
                        businessName: draft.businessName,
                        description: draft.pitch,
                        socials: draft.socials,
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
                  Step 2 · Demo images
                </h2>
                <Link
                  href="/apply?step=1"
                  className="inline-flex items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
                >
                  <Icon icon="mdi:arrow-left" width={15} /> Edit details
                </Link>
              </div>
              <p className="mb-5 text-sm text-[var(--mm-text-dim)]">
                Saved as a draft for{" "}
                <span className="text-[var(--mm-text)]">
                  {draft?.businessName || "your stall"}
                </span>
                . Add at least one image, then submit.
              </p>
              <ApplicationImagesForm />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
