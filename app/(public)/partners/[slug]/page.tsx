import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartner, getEventsByPartner } from "@/lib/content";
import {
  getPartnerReviewSummary,
  listPartnerReviews,
} from "@/lib/reviews";
import { auth } from "@/lib/auth";
import { isStaffUser } from "@/lib/home";
import { getMembership } from "@/lib/partner-access";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";
import { formatDateTime } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { parseReturn, withReturn } from "@/lib/return-to";
import { BackLink } from "@/components/back-link";
import { PartnerGallerySection } from "@/components/partner-gallery-section";
import { PartnerOfferingsSection } from "@/components/partner-offerings-section";
import { ExpandableImage } from "@/components/expandable-image";

const FALLBACK = "Browse the stalls of the Mythical Mecca partner directory.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = await getPartner(slug);
  if (!partner) return pageMetadata({ title: "Partner", description: FALLBACK });

  // The partner's own tagline is what they'd want quoted when someone shares
  // their stall; the bio is the longer fallback and gets clamped for us.
  const own = partner.tagline?.trim() || partner.bio?.trim();
  const trade = partner.categoryName
    ? `${partner.categoryName} at Mythical Mecca.`
    : "A trader at Mythical Mecca.";

  return pageMetadata({
    title: partner.businessName,
    description: own ? `${trade} ${own}` : `${trade} ${FALLBACK}`,
  });
}

/**
 * No generateStaticParams: this page calls auth(), so it can never render
 * statically — pre-listing every slug at build time only costs a DB round-trip.
 */

export default async function PartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    review?: string;
    preview?: string;
    from?: string;
    fromLabel?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { review, preview } = sp;
  // Opened from the directory, the home page, an event that names the partner
  // and the admin preview. The directory is right for one of those.
  const backTo = parseReturn(sp, { href: "/partners", label: "Partners" });
  const session = await auth();
  const canReview = session?.user
    ? await isStaffUser(session.user.id, session.user.role)
    : false;

  let partner = await getPartner(slug);

  /**
   * Owner preview. Without this a self-serve partner has no way to see what
   * they're about to submit. Authorization is proven here via getMembership —
   * `includeUnpublished` is only a query switch, never a permission.
   */
  let isPreview = false;
  if (!partner && preview && session?.user) {
    const draft = await getPartner(slug, { includeUnpublished: true });
    if (
      draft &&
      (await getMembership(session.user.id, draft.id, session.user.role))
    ) {
      partner = draft;
      isPreview = true;
    }
  }
  if (!partner) notFound();

  const [summary, reviews, partnerEvents] = await Promise.all([
    partner.showReviews
      ? getPartnerReviewSummary(partner.id)
      : Promise.resolve({ count: 0, average: 0 }),
    partner.showReviews
      ? listPartnerReviews(partner.id)
      : Promise.resolve([]),
    getEventsByPartner(partner.id),
  ]);
  const upcomingEvents = partnerEvents;

  const artItems = partner.gallery.filter((g) => g.kind === "art");
  const productItems = partner.gallery.filter((g) => g.kind === "product");

  return (
    /* Same omission as the index: a max-width with nothing to centre it and no
       gutter, so the stall profile sat against the left edge of the window. */
    <div className="mx-auto w-full max-w-5xl px-6 pt-8 pb-24">
      <div className="-ml-1">
        <BackLink to={backTo} />
      </div>

      {isPreview && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_12%,transparent)] p-3 text-sm text-[var(--mm-gold)]">
          <Icon icon="mdi:eye-outline" width={18} />
          Preview — this page isn&apos;t visible to the public yet.
        </div>
      )}

      {partner.bannerUrl && (
        <ExpandableImage
          src={partner.bannerUrl}
          alt={partner.businessName}
          title={partner.businessName}
          caption={partner.tagline || undefined}
          badge="Banner"
          containerClassName="mt-6 rounded-2xl border border-[var(--mm-border)] shadow-md"
          className="h-48 w-full object-cover md:h-64"
        />
      )}

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          {partner.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={partner.logoUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border border-[var(--mm-border)] object-cover"
            />
          )}
          <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-[family-name:var(--font-display)] text-4xl">
              {partner.businessName}
            </h1>
            {partner.isPremium && (
              <Badge color="var(--mm-gold)" icon="mdi:crown">
                Premium
              </Badge>
            )}
          </div>
          {partner.categoryName && (
            <p className="mt-2 text-xs uppercase tracking-widest text-[var(--mm-gold)]">
              {partner.categoryName}
            </p>
          )}
          <p className="mt-2 text-lg text-[var(--mm-text-dim)]">
            {partner.tagline}
          </p>
          </div>
        </div>
        {(partner.shopUrl || (partner.showSocials && partner.socials.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {partner.shopUrl && (
              <a
                href={partner.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mm-btn mm-btn-primary text-sm"
              >
                <Icon icon="mdi:storefront-outline" width={16} /> Visit shop
              </a>
            )}
            {partner.showSocials &&
              partner.socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mm-btn mm-btn-ghost text-sm"
              >
                <Icon icon={s.icon} width={16} />
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 max-w-2xl text-[var(--mm-text-dim)]">{partner.bio}</p>

      {review === "thanks" && (
        <div className="mt-8 rounded-xl border border-[var(--mm-live)] bg-[color-mix(in_srgb,var(--mm-live)_12%,transparent)] p-3 text-sm text-[var(--mm-live)]">
          Thanks! Your review has been sent for approval.
        </div>
      )}
      {review === "error" && (
        <div className="mt-8 rounded-xl border border-[var(--mm-danger)] bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] p-3 text-sm text-[var(--mm-danger)]">
          Something went wrong — please try again.
        </div>
      )}

      {/* ---------------- Products & services ---------------- */}
      {partner.offerings.length > 0 && (
        <PartnerOfferingsSection
          offerings={partner.offerings}
          partnerName={partner.businessName}
        />
      )}

      {/* ---------------- Gallery (gated) ---------------- */}
      {partner.showGallery && (
        <>
          {partner.showArt && artItems.length > 0 && (
            <PartnerGallerySection title="Art" items={artItems} />
          )}
          {partner.showProducts && productItems.length > 0 && (
            <PartnerGallerySection title="Products" items={productItems} />
          )}
        </>
      )}

      {/* ---------------- Upcoming events ---------------- */}
      {upcomingEvents.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide">
            <Icon
              icon="game-icons:campfire"
              width={22}
              className="text-[var(--mm-gold)]"
            />
            Upcoming events
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {upcomingEvents.map((e) => (
              <Link
                key={e.slug}
                href={withReturn(`/events/${e.slug}`, {
                href: `/partners/${partner.slug}`,
                label: partner.businessName,
              })}
                className="mm-glass group flex flex-col p-5 transition hover:border-[var(--mm-violet)]"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg group-hover:text-[var(--mm-gold)]">
                  {e.title}
                </h3>
                <p className="mt-1 flex-1 text-sm text-[var(--mm-text-dim)]">
                  {e.summary}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                  <Icon icon="mdi:clock-outline" width={14} />
                  {formatDateTime(e.startsAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Reviews (gated) ---------------- */}
      {partner.showReviews && (
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide">
              <Icon
                icon="mdi:message-star-outline"
                width={22}
                className="text-[var(--mm-gold)]"
              />
              Reviews
            </h2>
            {summary.count > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--mm-text-dim)]">
                <StarRating value={summary.average} width={16} />
                <span className="font-medium text-[var(--mm-text)]">
                  {summary.average.toFixed(1)}
                </span>
                <span>
                  ({summary.count} review{summary.count === 1 ? "" : "s"})
                </span>
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <div key={r.id} className="mm-glass flex flex-col p-5">
                  <StarRating value={r.rating} width={16} />
                  {r.body && (
                    <p className="mt-3 flex-1 text-sm text-[var(--mm-text-dim)]">
                      “{r.body}”
                    </p>
                  )}
                  <p className="mt-4 text-sm font-medium text-[var(--mm-text)]">
                    — {r.authorName}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--mm-text-dim)]">
              No reviews yet.
            </p>
          )}

          {canReview && (
            <div className="mm-glass mt-6 p-6">
              <h3 className="mb-4 font-[family-name:var(--font-display)] text-lg">
                Leave a review
              </h3>
              <ReviewForm
                targetType="partner"
                targetId={partner.id}
                partnerSlug={slug}
              />
            </div>
          )}
        </section>
      )}

      <p className="mt-10 text-sm text-[var(--mm-text-dim)]">
        Trade comes later — for now, reach this artisan via the links above.
      </p>
    </div>
  );
}
