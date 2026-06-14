# Design system

Dark sci-fi HUD. **Gold primary**, **blue→purple brand gradient**, **navy + dark-purple** darks.
Fully-rounded (pill) buttons. Glassmorphic panels, subtle particles/grid, restrained glow.

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| `--mm-gold` | `#F5C451` | Primary CTAs, key accents, energy |
| `--mm-gold-hi` | `#FFD874` | Hover/active gold |
| `--mm-blue` | `#2F4BE0` | Gradient start, links |
| `--mm-violet` | `#7C3AED` | Gradient end, secondary accent |
| `--mm-bg` | `#070B1E` | App background (deep navy) |
| `--mm-surface` | `#0F1330` | Cards, panels |
| `--mm-elevated` | `#1A1142` | Raised/modal (dark purple) |
| `--mm-border` | `#2A2F55` | Hairline borders |
| `--mm-text` | `#E6E9F5` | Primary text |
| `--mm-text-dim` | `#9AA3C7` | Muted text |
| `--mm-live` | `#34D399` | Online / live sortie dot |
| `--mm-danger` | `#F4577B` | Errors, destructive |

Brand gradient: `linear-gradient(135deg, #2F4BE0 0%, #7C3AED 100%)`.
Gold glow (sparingly): `0 0 24px rgba(245,196,81,.35)`.

## CSS variables (globals.css)

```css
:root {
  --mm-gold:#F5C451; --mm-gold-hi:#FFD874;
  --mm-blue:#2F4BE0; --mm-violet:#7C3AED;
  --mm-bg:#070B1E; --mm-surface:#0F1330; --mm-elevated:#1A1142;
  --mm-border:#2A2F55; --mm-text:#E6E9F5; --mm-text-dim:#9AA3C7;
  --mm-live:#34D399; --mm-danger:#F4577B;
  --mm-grad:linear-gradient(135deg,#2F4BE0,#7C3AED);
  --radius-pill:9999px; --radius-card:16px; --radius-md:12px;
  --glass:rgba(15,19,48,.6);
}
```

## Tailwind v4 theme (app.css `@theme`)

```css
@theme {
  --color-gold:#F5C451;
  --color-blue:#2F4BE0;
  --color-violet:#7C3AED;
  --color-bg:#070B1E;
  --color-surface:#0F1330;
  --color-elevated:#1A1142;
  --color-live:#34D399;
  --radius-pill:9999px;
}
```

## Components

- **Buttons** — pill (`border-radius: 9999px`), generous x-padding.
  - Primary: gold fill, navy text (`#070B1E`), gold glow on hover.
  - Secondary: transparent, gradient-border (blue→violet), light text.
  - Ghost: text + subtle surface hover.
- **Panels/cards** — `--mm-surface` at ~60% alpha + `backdrop-filter: blur(12px)`,
  1px `--mm-border`, `--radius-card`, faint inner top highlight for the glass edge.
- **HUD frames** — corner-bracket accents on hero/feature panels (clip-path corners).
- **Inputs** — dark surface, gradient focus ring, mono font for codes/data.
- **Badges/tags** — pill, division-tinted.
- **Sync gauge** — radial progress (conic-gradient gold), animated count-up.
- **Live dot** — `--mm-live`, soft pulse animation.

## Typography

- **Display / headings** — a techy face: `Orbitron` or `Rajdhani` (geometric, wide).
- **Body / UI** — `Inter`.
- **Data / codes / terminal** — `JetBrains Mono`.
- Headings may use the brand gradient as text fill (`background-clip:text`) for hero moments only.

## Motion

- **Boot sequence** — once-per-session, skippable: HUD lines draw in, panels power up (~1.2s).
- **Particles/lines** — tsParticles connected-dots field on hero; throttle on mobile / reduced-motion.
- **Page transitions** — Framer Motion fade+rise (8–12px), 180–240ms.
- **Hover** — gold glow, slight scale (1.02), gradient sweep on primary buttons.
- **Respect `prefers-reduced-motion`** — disable particles, boot, parallax.

## Per-view treatment

| View | Flash level | Notes |
|------|-------------|-------|
| Public + Pilot base | High | Particles, gradient hero, boot, glow |
| Vendor (Forge) | Medium | Static gradient header, no particles, dense data |
| Admin (Command) | Low–medium | Telemetry/cockpit, function first, minimal motion |

## Accessibility

- Maintain ≥4.5:1 text contrast (gold text only on dark; navy text on gold fills).
- Visible focus rings (gradient), keyboard nav, reduced-motion support, semantic landmarks.
