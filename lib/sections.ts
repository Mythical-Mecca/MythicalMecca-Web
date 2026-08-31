/**
 * Single source of truth for section-landing chrome: background image, accent,
 * icon, and hero copy. Every browse/section page renders <SectionHero
 * section="…" /> off this map, so the whole app shares one background system
 * instead of each page hand-rolling its own.
 */
import { ACCENT } from "@/lib/accents";

export interface SectionTheme {
  /** Hero background image (webp in /public). */
  bg: string;
  /** Accent colour for the section (icons, highlights). */
  accent: string;
  /** Eyebrow + section icon. */
  icon: string;
  /** Omit to lead with the title alone. */
  eyebrow?: string;
  /** Title renders as: `{lead} <gradient>{highlight}</gradient>`. */
  lead: string;
  highlight: string;
  subtitle: string;
}

export type SectionKey = "events" | "partners" | "quests";

export const SECTIONS: Record<SectionKey, SectionTheme> = {
  events: {
    bg: "/MM-News-Events-BG.webp",
    accent: ACCENT.events,
    icon: "game-icons:campfire",
    eyebrow: "The hall's calendar",
    lead: "Upcoming",
    highlight: "events",
    subtitle:
      "Feasts, tournaments, screenings and quests — every gathering the community is running. Pull up a chair.",
  },
  partners: {
    bg: "/MythicMechaBackground.webp",
    accent: ACCENT.partners,
    icon: "game-icons:anvil",
    lead: "Our",
    highlight: "partners",
    subtitle:
      "Makers, artists and shops from across the community set out their wares here. Apply if you want a stall of your own.",
  },
  quests: {
    // MythicMechaBackground3 (woods) — trails & scavenger hunts.
    bg: "/MythicMechaBackground3.webp",
    accent: ACCENT.quests,
    icon: "game-icons:treasure-map",
    eyebrow: "Seek & prove",
    lead: "The quest",
    highlight: "board",
    subtitle:
      "Scavenger trails, riddles and rune seals — solve, seek and prove your way up the leaderboard.",
  },
};
