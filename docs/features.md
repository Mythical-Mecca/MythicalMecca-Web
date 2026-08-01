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

## Quests

A quest is a **route around the venue**. Each objective is a destination — usually a
partner's stand — and adventurers check in when they get there. Objectives are
**free-order**: any of them can be tackled at any time.

Admin build them at `/admin/quests`. Players walk them at `/quests/[slug]`.
Vendors staff them at `/partner-hub/station/[stepId]`.

### Objective types

`type` decides how an objective is completed.

| Type | Experience | Verification |
|------|------------|--------------|
| `qr_scan` | **The workhorse.** Walk to the stand and check in there | Claim mode, below |
| `riddle` / `cipher` / `crossword` | Type an answer | Normalised match vs `config.answer` |
| `unlock_code` | Enter a code from a sign | Normalised match vs `config.code` |
| `trivia_gate` | Multiple choice | Index equals `config.correct` |
| `geo_checkpoint` | "Reach the coordinates" | Browser geolocation within `radius_m` |
| `photo_proof` | Upload a photo | Auto-approved |

`reveal_mode` is separate from type: **direct** names the destination up front
(wayfinding), **clue** withholds the stand's name and location until the objective is
claimed — `publicStep()` strips them server-side, so the answer never reaches the client.

### Why tags can be printed: identity, not authority

A printed QR code or an NFC tag is a **public string forever** — one photograph and it can
be shared with anyone. So a tag only ever *names* an objective (`/q/<signed-step-token>`)
and never grants completion. Proof of presence is a **second signal at claim time**. This
is what lets `claim_mode` be switched mid-event without reprinting a single tag.

| `claim_mode` | Proof of presence | Sharing exposure |
|--------------|-------------------|------------------|
| `live_code` | 4-digit code on the vendor's station screen, rolling every 60s | ~2 rotations, so a forwarded screenshot dies fast |
| `open_tag` | Venue geofence only (haversine from the event's coordinates) | **Shareable by design** — for low-stakes stops, or as the fallback when a vendor's device dies |
| `sealed_tag` | Reserved for NTAG 424 DNA tags, which sign every tap on-chip | Not implemented — **fails closed** |

`open_tag` silently does nothing when the attached event has no coordinates; the admin
objective form warns loudly in that case.

### Both directions

Which side holds the camera is up to the stand, and players needn't care — both are one
tap away on the quest page.

- **Player scans vendor.** Scan the printed tag or the station screen. The station QR
  encodes `/q/<token>?c=<code>`, so scanning it pre-fills the code: one tap to confirm.
- **Vendor scans player.** The player shows a rotating pass (`MMPASS1.…`, 60s window,
  ±1 tolerated); the station's camera reads it and `POST`s to
  `/api/quest-station/[stepId]/claim`. The vendor's authenticated device *is* the witness,
  so no code is involved — this is both the fastest option at a busy stand and the hardest
  to cheat.

Codes are derived, never stored: HOTP-style truncation of `HMAC(station_key, window)`.
The station key never leaves the server — `/api/quest-station/[stepId]` hands the display a
**three-code buffer**, so a couple of minutes offline doesn't stall check-ins.

### Progress, telemetry & the leaderboard

- `hunt_progress` is unique per `(step_id, user_id)`; completion is idempotent. Verified
  under concurrent claims: ten simultaneous requests award exactly once.
- Every attempt — success, duplicate, bad code, out of range — lands in
  `hunt_claim_attempts` with a coarse IP. `sharingFlags()` surfaces "N check-ins on one
  objective from one address in the last hour" on the admin monitor, which catches sharing
  even in `open_tag` mode, where it can't be prevented outright.
- A quest is claimable only while `active` **and** inside its `starts_at`/`ends_at` window.

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
