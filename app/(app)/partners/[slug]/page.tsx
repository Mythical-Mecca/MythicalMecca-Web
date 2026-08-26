import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartner, getPartners, getEventsByPartner } from "@/lib/content";
import {
  getPartnerReviewSummary,
  listPartnerReviews,
} from "@/lib/reviews";
import { auth } from "@/lib/auth";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";
import { formatDateTime } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = await getPartner(slug);
  return { title: partner?.businessName ?? "Partner" };
}

export async function generateStaticParams() {
  const partners = await getPartners();
  return partners.map((p) => ({ slug: p.slug }));
}

export default async function PartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { slug } = await params;
  const { review } = await searchParams;
  const partner = await getPartner(slug);
  if (!partner) notFound();

  const [session, summary, reviews, partnerEvents] = await Promise.all([
    auth(),
    partner.showReviews
      ? getPartnerReviewSummary(partner.id)
      : Promise.resolve({ count: 0, average: 0 }),
    partner.showReviews
      ? listPartnerReviews(partner.id)
      : Promise.resolve([]),
    getEventsByPartner(partner.id),
  ]);
  const upcomingEvents = partnerEvents;
  const loggedIn = !!session?.user;

  const artItems = partner.gallery.filter((g) => g.kind === "art");
  const productItems = partner.gallery.filter((g) => g.kind === "product");

  return (
    <div className="max-w-5xl pb-24">
      <Link
        href="/partners"
        className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        ← Partners
      </Link>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
        {partner.showSocials && partner.socials.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {partner.socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mm-btn mm-btn-ghost text-sm"
              >
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

      {/* ---------------- Gallery (gated) ---------------- */}
      {partner.showGallery && (
        <>
          {partner.showArt && artItems.length > 0 && (
            <GallerySection title="Art" items={artItems} />
          )}
          {partner.showProducts && productItems.length > 0 && (
            <GallerySection title="Products" items={productItems} />
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
                href={`/events/${e.slug}`}
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
              No reviews yet — be the first to share your experience.
            </p>
          )}

          <div className="mm-glass mt-6 p-6">
            <h3 className="mb-4 font-[family-name:var(--font-display)] text-lg">
              Leave a review
            </h3>
            {loggedIn ? (
              <ReviewForm
                targetType="partner"
                targetId={partner.id}
                partnerSlug={slug}
              />
            ) : (
              <p className="text-sm text-[var(--mm-text-dim)]">
                <Link
                  href="/login"
                  className="text-[var(--mm-gold)] hover:underline"
                >
                  Sign in to leave a review
                </Link>{" "}
                for this partner.
              </p>
            )}
          </div>
        </section>
      )}

      <p className="mt-10 text-sm text-[var(--mm-text-dim)]">
        Trade comes later — for now, reach this artisan via the links above.
      </p>
    </div>
  );
}

function GallerySection({
  title,
  items,
}: {
  title: string;
  items: { title: string; caption: string; imageUrl?: string }[];
}) {
  return (
    <>
      <h2 className="mt-12 font-[family-name:var(--font-display)] text-xl tracking-wide">
        {title}
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g, i) => (
          <div key={i} className="mm-glass overflow-hidden p-0">
            {g.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={g.imageUrl}
                alt={g.title || g.caption || ""}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div
                className="h-40 w-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.45), rgba(245,196,81,0.35))",
                }}
              />
            )}
            {(g.title || g.caption) && (
              <div className="p-4">
                {g.title && <p className="font-medium">{g.title}</p>}
                {g.caption && (
                  <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                    {g.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
