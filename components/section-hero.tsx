import { SECTIONS, type SectionKey } from "@/lib/sections";
import { PageHeading } from "@/components/page-heading";

/**
 * Standardized index-page header. Pulls copy from the central section registry
 * (lib/sections.ts) and renders it through the shared <PageHeading> so section
 * pages match detail pages. The section's imagery is the full-page background
 * (see <AppBackdrop>).
 */
export function SectionHero({
  section,
  actions,
}: {
  section: SectionKey;
  actions?: React.ReactNode;
  /** Retained for call-site compatibility; the header is compact regardless. */
  size?: "default" | "large";
}) {
  const s = SECTIONS[section];
  // The icon rides on the eyebrow. Handed one without an eyebrow,
  // <PageHeading> promotes it to a chip beside the title — which would put a
  // new element on screen in place of the one a section chose to drop.
  const icon = s.eyebrow ? s.icon : undefined;
  return (
    <PageHeading
      eyebrow={s.eyebrow}
      icon={icon}
      accent={s.accent}
      title={
        <>
          {s.lead} <span className="mm-gradient-text">{s.highlight}</span>
        </>
      }
      subtitle={s.subtitle}
      actions={actions}
    />
  );
}
