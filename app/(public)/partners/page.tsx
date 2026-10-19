import Link from "next/link";
import { getPartnersByCategory } from "@/lib/content";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { SectionHero } from "@/components/section-hero";
import { PartnerTileGrid } from "@/components/partner-tile-grid";
import { pageMetadata } from "@/lib/metadata";
import { withReturn } from "@/lib/return-to";

export const metadata = pageMetadata({
  title: "Partners",
  description:
    "The traders, makers and studios of Mythical Mecca — miniatures, games, art, apparel and more, listed by craft. Browse the stalls or apply for one of your own.",
});

export default async function PartnersPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeCategory = resolvedSearchParams.category?.toLowerCase() || "all";
  const allGroups = await getPartnersByCategory();

  // Filter groups if a specific category tab was selected
  const groups =
    activeCategory && activeCategory !== "all"
      ? allGroups.filter((g) => g.slug.toLowerCase() === activeCategory)
      : allGroups;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 pt-6 sm:pt-8 overflow-x-hidden">
      <SectionHero
        section="partners"
        actions={
          <Link
            href={withReturn("/apply", { href: "/partners", label: "Partners" })}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-[var(--mm-text)] transition-colors hover:text-[var(--mm-gold)]"
          >
            Sign up as a vendor / partner{" "}
            <Icon icon="mdi:arrow-right" width={16} />
          </Link>
        }
      />

      {/* Category Navigation Tabs */}
      {allGroups.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[var(--mm-border)] pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--mm-text-dim)] mr-2">
            Tabs:
          </span>
          <Link
            href="/partners"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
              activeCategory === "all"
                ? "border-[var(--mm-gold)] bg-[var(--mm-gold)] text-[var(--mm-bg)] font-semibold"
                : "border-[var(--mm-border)] bg-[var(--mm-elevated)] text-[var(--mm-text-dim)] hover:text-[var(--mm-text)] hover:border-[var(--mm-gold)]"
            }`}
          >
            <Icon icon="game-icons:anvil" width={14} />
            All Partners ({allGroups.reduce((acc, g) => acc + g.partners.length, 0)})
          </Link>
          {allGroups.map((group) => {
            const isActive = activeCategory === group.slug.toLowerCase();
            return (
              <Link
                key={group.slug}
                href={`/partners?category=${group.slug}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-[var(--mm-gold)] bg-[var(--mm-gold)] text-[var(--mm-bg)] font-semibold shadow-sm"
                    : "border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] hover:border-[var(--mm-gold)]"
                }`}
              >
                <span>{group.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive
                      ? "bg-black/20 text-[var(--mm-bg)] font-bold"
                      : "bg-white/10"
                  }`}
                >
                  {group.partners.length}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="py-16 text-center text-[var(--mm-text-dim)]">
          <p>No stalls found in this category.</p>
          <Link
            href="/partners"
            className="mt-3 inline-block text-xs text-[var(--mm-gold)] underline"
          >
            View all partners
          </Link>
        </div>
      ) : (
        <div className="space-y-14 pt-8 pb-24">
          {groups.map((group) => (
            <section key={group.slug} id={group.slug} className="scroll-mt-24">
              <div className="flex items-baseline gap-2.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 self-center rounded-full bg-[var(--mm-blue)]"
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

              <PartnerTileGrid
                partners={group.partners}
                categoryName={group.name}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
