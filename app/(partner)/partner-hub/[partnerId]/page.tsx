import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/partner-access";
import { getPartnerForHub, listMyGallery } from "@/lib/partner";
import { submitPartnerForReview } from "../../actions";
import { PARTNER_STATUS } from "@/components/partner-status-badge";
import { Flash } from "@/components/flash";
import { Icon } from "@/components/icon";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  return { title: `${partner?.businessName ?? "Stall"}` };
}

const SUBMIT_ERRORS: Record<string, string> = {
  incomplete: "Add a bio before submitting — reviewers need something to read.",
  state: "This stall isn't in a state that can be submitted.",
  "1": "Could not submit — please try again.",
};

export default async function StallOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ created?: string; submitted?: string; error?: string }>;
}) {
  // Access is already enforced by the [partnerId] layout; this re-read tells us
  // the caller's role, which decides whether "Submit for review" is theirs.
  const { partnerId } = await params;
  const session = await auth();
  const [partner, membership] = await Promise.all([
    getPartnerForHub(partnerId),
    getMembership(session!.user.id, partnerId, session!.user.role),
  ]);
  if (!partner) notFound();
  const gallery = await listMyGallery(partner.id);
  const { created, submitted, error } = await searchParams;

  const status = PARTNER_STATUS[partner.status];
  // Submitting is owner-only in the action — don't offer it to a manager and
  // then bounce them to a denied page.
  const canSubmit =
    membership?.role === "owner" &&
    (partner.status === "draft" || partner.status === "rejected");

  return (
    <div className="space-y-6">
      {created && (
        <Flash>Stall created. Fill in the profile, then submit it for review.</Flash>
      )}
      {submitted && <Flash>Sent for review. We&apos;ll be in touch.</Flash>}
      {error && <Flash tone="error">{SUBMIT_ERRORS[error] ?? SUBMIT_ERRORS["1"]}</Flash>}

      <div
        className="mm-glass p-5"
        style={{ borderColor: `color-mix(in srgb, ${status.color} 45%, transparent)` }}
      >
        <p className="flex items-center gap-2 text-sm" style={{ color: status.color }}>
          <Icon icon={status.icon} width={18} />
          {status.label}
        </p>
        <p className="mt-1 text-sm text-[var(--mm-text-dim)]">{status.hint}</p>
        {partner.status === "rejected" && partner.reviewNote && (
          <p className="mt-3 rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-3 text-sm text-[var(--mm-text)]">
            {partner.reviewNote}
          </p>
        )}
        {canSubmit && (
          <form action={submitPartnerForReview} className="mt-4">
            <input type="hidden" name="partnerId" value={partner.id} />
            <button type="submit" className="mm-btn mm-btn-primary">
              <Icon icon="mdi:send-outline" width={16} /> Submit for review
            </button>
          </form>
        )}
      </div>

      <div className="mm-glass p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
          Stall
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl">
          {partner.businessName}
        </h2>
        <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
          {partner.tagline ?? "Add a tagline in your profile."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/partner-hub/${partner.id}/gallery`} className="mm-glass p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            Gallery items
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
            {gallery.length}
          </p>
        </Link>
        <Link href={`/partner-hub/${partner.id}/profile`} className="mm-glass p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            Stall profile
          </p>
          <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
            Edit tagline, bio &amp; socials →
          </p>
        </Link>
      </div>
    </div>
  );
}
