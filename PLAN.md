# Mythical Mecca 2.0 — Master Plan

> A geek community homebase. Members are **Pilots**; the site is their **hangar / cockpit**.
> Dark sci-fi HUD aesthetic: gold primary, blue→purple gradient, navy/purple darks.

## 1. Vision

Mythical Mecca is a homebase for a broad geek community spanning four domains, modelled as
**Divisions / Squadrons**:

- **Tabletop Division** — TTRPG, board games, miniatures
- **Arcade Division** — video gaming & esports
- **Otaku Division** — anime, manga, comics, cosplay
- **Maker Division** — tech, electronics, sci-fi, makers

The mecha-pilot fiction unifies every feature so nothing feels bolted on (see
[Concept mapping](#3-concept-mapping)).

## 2. Roles & view worlds

| Role | Meaning | Access | Shell |
|------|---------|--------|-------|
| **Recruit** (visitor) | Not logged in | Public pages only | Public marketing shell, flashy |
| **Pilot** (member) | Google login | The app | Simple topnav + main menu |
| **Forge** (vendor) | Member + approved vendor | Vendor area | Dashboard shell, calmer |
| **Command** (admin) | Full control | Admin panel | Dashboard shell, calmer |

Three visual treatments:
- **Base app** — very stylish, animated, particle/HUD heavy.
- **Vendor area** — dashboard, still styled, flash dialed down for usability.
- **Admin area** — dashboard, telemetry/cockpit feel, function first.

## 3. Concept mapping

| Generic | Mythical Mecca framing |
|---------|----------------------|
| Roles | Recruit → Pilot → Forge → Command |
| Profile | Mech loadout: rank, XP core, badges, squadron emblem |
| Event-day login | "Sortie available" — boot-up, green dot = mech online |
| Vendor gallery | The Armory — manufacturers showcasing gear |
| Scavenger hunt | Mission / Op — objectives, QR = data uplinks |
| XP & ranks | Sync rate climbing with participation |
| Factions | Squadrons — seasonal points |
| Admin logs | Command telemetry — black-box recorder |
| Collab form | Distress beacon — signal to Command |

## 4. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + `proxy.ts` (no `middleware.ts`) |
| DB | Neon Postgres |
| ORM | Drizzle |
| Auth | Auth.js v5, Google provider, role in JWT |
| Storage | Vercel Blob (obscured keys, `files` registry table) |
| Styling | Tailwind v4 + shadcn/ui, custom sci-fi theme |
| Motion | Framer Motion + tsParticles / react-three-fiber (hero) |
| QR | `qrcode` (generate) + signed tokens |
| Hosting | Vercel |

Detailed docs:
- [Architecture](docs/architecture.md) — routes, proxy.ts, auth, logging, file pipeline
- [Data model](docs/data-model.md) — full schema
- [Design system](docs/design-system.md) — tokens, components, motion
- [Features](docs/features.md) — events live layer, scavenger hunts, gamification, arcade

## 5. Roadmap

Phases are sequenced so each builds on a verified foundation.

### Phase 0 — Foundation
- [ ] Scaffold Next.js + TypeScript + Tailwind v4
- [ ] Design tokens + base theme (gold / blue→purple / navy)
- [ ] Neon project + Drizzle setup + migrations
- [ ] Auth.js v5 + Google OAuth, role enum, session
- [ ] `proxy.ts` route guarding (cheap edge checks, no DB)
- [ ] Logging tables + helpers (activity, error, page hits)
- [ ] Base layout shells for the 4 route groups

### Phase 1 — Public site
- [ ] Home (animated hero, particles)
- [ ] News & posts (list + detail)
- [ ] Events list + public event page
- [ ] Partners / vendors gallery (The Armory)
- [ ] Collab form (distress beacon)

### Phase 2 — Member area + files
- [ ] Pilot dashboard (simple view)
- [ ] Profile management (mech loadout)
- [ ] Vendor application flow + pending-status tracking
- [ ] File uploader: Vercel Blob, obscured keys, `files` table, detailed progress bar

### Phase 3 — Vendor + Admin
- [ ] Vendor dashboard (manage gallery, socials)
- [ ] Admin panel: posts, events, application review
- [ ] Command telemetry: log viewer (activity / errors / hits)

### Phase 4 — Events live layer
- [ ] "Live today" sortie dashboard card
- [ ] Green-dot + event name in main menu
- [ ] Add-to-calendar (.ics) + share
- [ ] Event comments
- [ ] Event reviews (gated to day-of and after)

### Phase 5 — Scavenger hunts + gamification
- [ ] Hunt engine: hunts → steps → progress, dynamic step types
- [ ] QR step (live-generated, signed token) + geo + riddle/puzzle
- [ ] Live hunt leaderboard
- [ ] XP, ranks, badges
- [ ] Squadron scoring + seasonal standings
- [ ] Arcade bay (first sim game + leaderboard)

## 6. Open decisions (track here)
- Boot sequence on first load — keep, skippable, once-per-session (proposed: yes).
- Squadrons competitive vs. content-only (proposed: competitive, light season).
- Hunts in-person only vs. remote ops too (proposed: support both via step types).
- Public homepage flash level pre-login (proposed: full hero, gated content below).
