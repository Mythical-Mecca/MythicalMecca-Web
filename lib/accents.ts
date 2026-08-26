/**
 * The one place a concept is assigned a colour.
 *
 * Colour was doing real navigational work here — the nav menu, the launcher
 * tiles, the admin sidebar and the section registry each tinted their icons —
 * except each one had picked its own hex. Quests was green in the nav menu and
 * purple in the tiles; Partners was green in the menu and gold in the tiles. A
 * reader learning "purple means quests" was being taught the opposite one
 * screen over, which is worse than no colour coding at all.
 *
 * Anything that tints a section, a nav entry or a card header pulls from here.
 */
export const ACCENT = {
  /** Home base — the dashboard and the member's own record. */
  dashboard: "#4aa8ff",
  profile: "#4aa8ff",

  /** The three member sections. These match `SECTIONS` in lib/sections.ts. */
  events: "#5cc08c",
  quests: "#9a6cff",
  partners: "#E18D01",

  /** Marketplace operations — applying for and running a stall. */
  marketplace: "#E18D01",

  /** Admin-only areas that have no member-facing counterpart. */
  admin: "#FFB13D",
  gallery: "#e0b0ff",
  reviews: "#f0a6c8",
  logs: "#48c8d6",
} as const;

export type AccentKey = keyof typeof ACCENT;

/**
 * A readable version of an accent, for text sitting on that accent's own tint.
 *
 * The house pattern for badges, tab pills and card action chips is "accent text
 * on a 14–16% wash of the same accent". That reads beautifully and fails WCAG
 * for every accent darker than gold — violet landed at 3.4:1, danger 3.7:1,
 * purple 3.9:1 against their own tints, all short of 4.5. Lifting the text 25%
 * toward white keeps the hue identifiable and clears 5:1 across the palette.
 *
 * Use for TEXT on a tint. Borders, icons and fills should keep the raw accent —
 * they only owe 3:1, which the palette already meets.
 */
export function accentText(color: string): string {
  return `color-mix(in srgb, ${color} 75%, white)`;
}
