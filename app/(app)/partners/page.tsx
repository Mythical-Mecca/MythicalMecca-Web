import Link from "next/link";
import { getPartners } from "@/lib/content";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { SectionHero } from "@/components/section-hero";

export const metadata = { title: "Partners — Mythical Mecca" };

export default async function PartnersPage() {
  const partners = await getPartners();

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

      <div className="pt-8 pb-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {partners.map((p) => (
          <Link
            key={p.slug}
            href={`/partners/${p.slug}`}
            className="mm-glass group overflow-hidden p-0 transition hover:border-[var(--mm-violet)]"
          >
            <div
              className="h-36 w-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(47,75,224,0.5), rgba(124,58,237,0.5))",
              }}
            />
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
              <h2 className="font-medium group-hover:text-[var(--mm-gold)]">
                {p.businessName}
              </h2>
              {p.categoryName && (
                <span className="mt-1 inline-block">
                  <Badge color="var(--mm-violet)">{p.categoryName}</Badge>
                </span>
              )}
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                {p.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
