"use client";

import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/sections";
import { AuroraField } from "./animations/aurora-field";
import { ParticleField } from "./animations/particle-field";

const DASHBOARD_BG = "/MMLandingPageBackground.webp";
const DEFAULT_BG = "/MythicMechaBackground.webp";

/**
 * Route → full-page background image, keyed off the section registry.
 */
function bgForPath(path: string): string {
  if (path.startsWith("/dashboard")) return DASHBOARD_BG;
  if (path.startsWith("/events")) return SECTIONS.events.bg;
  if (path.startsWith("/quests")) return SECTIONS.quests.bg;
  // /partners is public now and lives outside this layout — no branch for it.
  return DEFAULT_BG; // profile, apply, etc.
}

/**
 * Full-page fixed background for every logged-in page: the section's image,
 * a legibility overlay, and a subtle drifting aurora + embers on top. The
 * image is picked from the route so each section carries its own scene behind
 * the (semi-transparent) content.
 *
 * This is the only animation that never pauses — it's fixed and full-viewport,
 * so it is always "on screen" and the off-screen guard can never kick in. It
 * therefore runs at a deliberately low budget: 20fps (it's a slow drift behind
 * 35% opacity — nobody can tell), a 1x backing store regardless of display
 * density, and a reduced ember count to bound the O(n²) link pass. Feature
 * placements like the homepage hero keep the richer defaults.
 */
const AMBIENT = { fps: 20, maxDpr: 1 } as const;

/**
 * A single quest, walked in a hall on a phone.
 *
 * No photograph, no aurora, no embers: the page is a checklist somebody reads
 * in bad light while walking, and a detailed scene behind semi-transparent
 * cards is the one thing that makes it harder. Navy through to a gold-warmed
 * navy, and nothing else moving. The trailing slash keeps the quest BOARD on
 * the usual treatment — only a quest itself goes plain.
 */
const QUEST_GRADIENT =
  "linear-gradient(165deg, var(--mm-bg) 0%, color-mix(in oklab, var(--mm-bg) 88%, var(--mm-blue)) 45%, color-mix(in oklab, var(--mm-bg) 78%, var(--mm-gold)) 100%)";

export function AppBackdrop() {
  const path = usePathname();

  if (path.startsWith("/quests/")) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ background: QUEST_GRADIENT }}
      />
    );
  }

  const bg = bgForPath(path);

  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(11,15,28,0.74) 0%, rgba(11,15,28,0.7) 35%, rgba(11,15,28,0.82) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <AuroraField {...AMBIENT} />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <ParticleField {...AMBIENT} maxPoints={34} />
      </div>
    </div>
  );
}
