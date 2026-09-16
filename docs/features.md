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

### External sign-up (no-data events)

At an event where we hold no personal data, the partner may still need a real
registration — on **their** form, off our site. The event carries a link to it
(`events.signup_url`, set on the event's Details tab under "External sign-up
form"), and every quest at that event asks for it:

- **Start.** Once a player has picked a handle, the trail waits behind a card: the
  link, a line of why, and a tick — "I've filled it in". We can't see the form, so
  the tick is their word; the copy says so. Scans at a stand still land while the
  card is showing.
- **Webhook.** The form's side can `POST` to `/api/signup-hooks/<secret>` with
  `{ "handle": "…", "externalId": "…" }` (JSON or form-encoded; `username` /
  `alias` / `player` are accepted for the handle, `external_id` / `id` / `reference`
  for the id). The secret is minted when a link is first saved, shown in the
  "Sign-up webhook" card on the event's Details tab, and rotatable there. The
  quest editor's Settings tab just says whether the event asks for one and links
  across. Only the handle and reference are stored
  (`player_signups`, one row per handle per event); the rest of the body is dropped
  on the floor, because it is exactly the data the event promised not to hold.
- **End.** When the trail is done and no webhook has named this handle, a reminder
  shows with the link and "I've already done this" to dismiss it. A confirmed
  handle sees a quiet "Signed up" line instead.
- **Organiser.** The Progress tab marks each adventurer *Signed up* (webhook,
  green, with the reference), *Says signed up* (their tick, gold) or *No sign-up*,
  and lists webhook arrivals that match nobody — usually a typo on the form.

Matching is by handle, case-insensitive, at read time: a webhook that arrives before
the player picks that name still counts the moment they do.

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
- **Partner application** — see Partners below.

## Partners

A partner is a vendor or stallholder with a public page (`/partners/[slug]`). The
schema calls them `partners`; the UI says "stall" to the people running one.

**Lifecycle.** `partners.status` (draft → pending → approved / rejected) is the review;
`partners.active` is the separate listing switch. Public needs **both** approved and
active. There are two ways in:

- **Application** (`/apply`) — first-time applicants pitch a stall in a category that
  requires one. An admin approves or rejects at `/admin/partners/applications`; a
  rejection requires a note, which the applicant sees. Approval creates the partner
  (approved, listed), makes the applicant its owner, flips their role to `partner` and
  copies the sample images into the gallery.
- **Self-serve stall** — an existing partner opens another in the hub (`/partner-hub/new`),
  builds it as a draft and submits it; it lands in `/admin/partners/queue` for
  "Approve & publish" or "Request changes" with a note.

**Admin management** (`/admin/partners`):

- The list is an editable table: name, status, listed, category, premium, tagline, slug,
  shop link, bio and review note are all edited in place; bulk approve / list / unlist;
  search and per-column filters. Each row opens the public page (or a preview when it is
  not public), the manage page, or the hub view.
- `/admin/partners/new` adds a partner by hand — created approved and listed. An owner
  email is optional: an existing account is made owner on the spot, anyone else gets an
  owner invitation whose link is shown for hand-delivery.
- `/admin/partners/[id]` is tabbed: **Details** (every column, logo and banner with
  remove, status with review note, listed and premium), **Gallery** (add up to 12, kind,
  caption, reorder, remove), **Products** (add, edit in place, hide, reorder, remove),
  **Team** (add by email or link, roles, remove, revoke invitations) and **Advanced**
  (delete — members, invites, products and gallery cascade; events and quest stands keep
  going with the partner link cleared).
- Categories (`/admin/partners/categories`) carry the display toggles that shape a
  partner's page. A category can be deleted only once no partner is in it.

**Partner hub** (`/partner-hub`) is the self-service side: profile, gallery, products and
team, scoped by `partner_members` (owner | manager). Admins are treated as a synthetic
owner of every stall there, which is what the "Partner Hub" button on the admin page
opens.
