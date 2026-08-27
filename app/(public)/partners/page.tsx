import Link from "next/link";
import { getPartnersByCategory } from "@/lib/content";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { SectionHero } from "@/components/section-hero";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Partners",
  description:
    "The traders, makers and studios of Mythical Mecca — miniatures, games, art, apparel and more, listed by craft. Browse the stalls or apply for one of your own.",
});

export default async function PartnersPage() {
  // The full directory: every category with partners, not just the featured
  // ones the homepage shows.
  const groups = await getPartnersByCategory();

  return (
    <>
      <SectionHero
        section="partners"
        actions={
          <Link href="/apply" className="mm-btn mm-btn-primary">
            <Icon icon="game-icons:shop" width={18} /> Apply for a stall
          </Link>
        }
      />

      {groups.length === 0 ? (
        <p className="py-16 text-center text-[var(--mm-text-dim)]">
          The first stalls are still being set up.
        </p>
      ) : (
        <div className="space-y-14 pt-8 pb-24">
          {groups.map((group) => (
            <section key={group.slug}>
              <div className="flex items-baseline gap-2.5">
                <Icon
                  icon={group.icon ?? "game-icons:anvil"}
                  width={22}
                  style={{ color: group.color ?? "var(--mm-gold)" }}
                />
                <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
                  {group.name}
                </h2>
                <span className="text-sm text-[var(--mm-text-dim)]">
                  ({group.partners.length})
                </span>
              </div>
              {group.description && (
                <p className="mt-1.5 max-w-2xl text-sm text-[var(--mm-text-dim)]">
                  {group.description}
                </p>
              )}

              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.partners.map((p) => {
                  // Prefer the partner's own imagery; fall back to the gradient
                  // placeholder this page has always used.
                  const hero = p.bannerUrl ?? p.gallery.find((g) => g.imageUrl)?.imageUrl;
                  return (
                    <Link
                      key={p.slug}
                      href={`/partners/${p.slug}`}
                      className="mm-glass group overflow-hidden p-0 transition hover:border-[var(--mm-violet)]"
                    >
                      {hero ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={hero}
                          alt=""
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-36 w-full"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(47,75,224,0.5), rgba(124,58,237,0.5))",
                          }}
                        />
                      )}
                      <div className="p-5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          {p.isPremium ? (
                            <Badge color="var(--mm-gold)" icon="mdi:crown">
                              Premium
                            </Badge>
                          ) : (
                            <span />
                          )}
                          <span className="text-xs text-[var(--mm-text-dim)]">
                            {p.gallery.length} items
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {p.logoUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.logoUrl}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <h3 className="font-medium group-hover:text-[var(--mm-gold)]">
                            {p.businessName}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-sm text-[var(--mm-text-dim)]">
                          {p.tagline}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
