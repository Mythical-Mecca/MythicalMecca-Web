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

export default async function PartnersPage() {
  // The full directory: every category with partners, not just the featured
  // ones the homepage shows.
  const groups = await getPartnersByCategory();

  return (
    /* The public layout leaves `main` unwrapped on purpose — the homepage runs
       full-bleed sections that each bring their own container. Index pages like
       this one therefore have to supply it themselves, and this one never did:
       the headings, the hero and every card sat flush against the viewport
       edge.

       The gutter is wider than the signed-in shell's `px-6`. The cards here are
       image-topped and run to the edge of their own box, so the same gutter
       that suits a page of text left them looking wedged against the viewport.
       Everything in the page shares this container, so the hero, the section
       headings and the cards all still line up with each other. */
    <div className="mx-auto w-full max-w-6xl px-8 pt-8">
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
      {groups.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[var(--mm-border)] pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--mm-text-dim)] mr-2">
            Categories:
          </span>
          <a
            href="#all"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mm-border)] bg-[var(--mm-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--mm-gold)] shadow-sm hover:border-[var(--mm-gold)] transition"
          >
            <Icon icon="game-icons:anvil" width={14} />
            All Partners ({groups.reduce((acc, g) => acc + g.partners.length, 0)})
          </a>
          {groups.map((group) => (
            <a
              key={group.slug}
              href={`#${group.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] hover:border-[var(--mm-gold)] transition"
            >
              <span>{group.name}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                {group.partners.length}
              </span>
            </a>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-16 text-center text-[var(--mm-text-dim)]">
          The first stalls are still being set up.
        </p>
      ) : (
        <div className="space-y-14 pt-8 pb-24">
          {groups.map((group) => (
            <section key={group.slug} id={group.slug} className="scroll-mt-24">
              <div className="flex items-baseline gap-2.5">
                {/* See the note on the home page: a dot rather than each
                    category own icon, so the list reads as one list. */}
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
