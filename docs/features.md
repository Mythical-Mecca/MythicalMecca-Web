# Feature specs

## Events live layer

**"Live today" detection.** An event is *live-relevant* to a Pilot when
`now()` is within `[starts_at - lead, ends_at]` (lead ~ start of day-of). On login/app load:

- A **sortie dashboard card** renders at the top of the Pilot dashboard: title, countdown
  or "in progress", current objective (if a hunt is attached), and a **Launch** CTA to
  `/events/[id]/live`.
- The **main menu** shows a **green dot + event name** at the top (pulse animation).
- Server-computed (no client clock trust); revalidate on an interval / on focus.

**Public event page** (`/events/[id]`) — details, cover, location/map, add-to-calendar,
share, comments; reviews appear once the event has started.

**Add to calendar.** Generate an `.ics` on the fly (`/events/[id]/event.ics`) plus
Google Calendar template link. Buttons: Google, Apple/Outlook (.ics).

**Share.** Web Share API where available; fallback to copy-link + X/Discord/Facebook intents.
Open Graph image per event (cover + title overlay).

**Comments** — members only, live anytime, soft-deletable, logged.

**Reviews** — `rating 1–5 + body`. **Gated**: the review form is hidden/disabled until
`now() >= starts_at`; enforced again in the server action. One review per user per event,
editable. Aggregate score shown on the public page after the event ends.

## Scavenger hunts ("Ops")

A hunt = ordered (or free-order) **steps**. Every step shares a base — completion +
timestamp + points — and carries a `type` with a `config` for type-specific behavior.

### Step types

| Type | Pilot experience | Verification |
|------|------------------|--------------|
| `qr_scan` | Scan a code at a location → "data uplink" overlay | Signed token matches step (see below) |
| `riddle` | Type an answer | Normalized/fuzzy match vs `config.answer` |
| `crossword` / `cipher` | Solve interactive on-page puzzle | Grid/answer state matches solution |
| `geo_checkpoint` | "Reach the coordinates" | Browser geolocation within `radius_m` |
| `photo_proof` | Upload a photo (file pipeline) | Auto or admin approval |
| `trivia_gate` | Timed multiple-choice | Correct index within time limit |
| `unlock_code` | Enter a code from a sign/prior step | Equals `config.code` |

New types slot in by adding an enum value + a renderer + a verifier — the base
(progress, points, leaderboard) is unchanged.

### QR uplink security

- QR is **generated live** during hunt setup; admin pastes/links the destination.
- Encoded URL carries a **signed token**: `HMAC(QR_SIGNING_SECRET, hunt_id|step_id|nonce)`.
- `/api/hunt/scan` verifies signature + that the step belongs to an active hunt the user
  is enrolled in, then records `hunt_progress`. Prevents guessing/sharing screenshots
  across hunts (optionally bind to a short time window or one-scan nonce).

### Progress & leaderboard

- `hunt_progress` is unique per `(step_id, user_id)`; completion is idempotent.
- Live leaderboard: total points, then earliest last-step time (speed bonus). Realtime-ish
  via polling or Neon `LISTEN`/SSE.
- Sequential hunts gate step N+1 on N when `requires_prev`.

## Gamification

- **XP** — every meaningful action writes an `xp_ledger` row; `users.xp` is the running
  total. Actions: post (author), attend event, complete hunt step, win/score in arcade,
  first daily login, badge unlocks.
- **Ranks (sync rate)** — XP thresholds map to ranks: Initiate → Operative → Vanguard →
  Ace → Ascendant. Profile shows an animated sync gauge + "next rank in N XP".
- **Badges** — coded achievements with criteria (jsonb), tiers bronze→legendary, evaluated
  on relevant events. e.g. `first_contact` (first login), `hunt_master` (complete a hunt),
  `night_owl`, `armorer` (vendor approved).
- **Squadrons** — each Division is a squadron; events/hunts/arcade award **squadron points**
  per **season**. Homepage shows the season standings HUD bar; season resets archive results.

## Arcade ("training simulators")

Cheap-to-build, sticky, each with a leaderboard:

1. **Daily cipher** — one shared puzzle/day; streaks; everyone sees the same board.
2. **Reaction sim** — measure reaction time; pure leaderboard, trivial to build.
3. **Async shooter / runner** — simple canvas game, submit score (signed to deter cheating).
4. **Trivia gauntlet** — geek-culture questions by division; feeds squadron points.

Score submission goes through a server action that validates and writes `game_scores`
(+ `xp_ledger`). Leaderboards are top-N per game and per season.

## Member area

- **Profile (mech loadout)** — avatar (file pipeline), display name, division/squadron,
  rank + sync gauge, badge wall, recent activity.
- **Vendor application** — multi-field form (business name, pitch, socials, sample media),
  submits a `vendor_applications` row; **pending tracking** shows status + review note;
  on approval the user's role flips to `vendor` and a `vendors` row is created.
