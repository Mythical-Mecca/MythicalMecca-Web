# Data model

Postgres via Drizzle. Naming: `snake_case` columns, `id` = `uuid` default `gen_random_uuid()`,
timestamps `created_at` / `updated_at` (tz). Soft-delete via `deleted_at` where useful.

## Enums

```
role          : recruit | member | vendor | admin   (stored: member|vendor|admin; recruit = no row)
app_status    : pending | approved | rejected
post_status   : draft | published | archived
event_status  : draft | published | live | ended | cancelled
division       : tabletop | arcade | otaku | maker
file_entity   : avatar | post | event | vendor_gallery | hunt_proof | misc
step_type     : qr_scan | riddle | crossword | cipher | geo_checkpoint | photo_proof | trivia_gate | unlock_code
log_level     : debug | info | warn | error | fatal
```

## Identity & roles

```
users(
  id, email unique, name, image, google_sub unique,
  role(default 'member'), division, sync_rate int default 0, xp int default 0,
  rank text, created_at, updated_at, last_seen_at
)
-- Auth.js adapter tables: accounts, sessions, verification_tokens
```

## Vendors

```
vendor_applications(
  id, user_id -> users, status(app_status, default 'pending'),
  business_name, pitch, socials jsonb, payload jsonb,
  reviewed_by -> users (null), review_note, created_at, updated_at
)

vendors(
  id, user_id -> users unique, slug unique, business_name, tagline, bio,
  logo_file_id -> files, socials jsonb, division, active bool default true,
  created_at, updated_at
)

vendor_gallery_items(
  id, vendor_id -> vendors, file_id -> files, title, caption, sort int,
  external_url, created_at
)
```

## Content

```
posts(
  id, author_id -> users, slug unique, title, excerpt, body_md,
  cover_file_id -> files, division, status(post_status), published_at,
  created_at, updated_at
)

events(
  id, slug unique, title, summary, body_md, cover_file_id -> files,
  division, status(event_status), location, lat, lng,
  starts_at, ends_at, capacity int, created_by -> users,
  created_at, updated_at
)

event_comments(
  id, event_id -> events, user_id -> users, body, created_at, deleted_at
)

event_reviews(
  id, event_id -> events, user_id -> users, rating(1-5), body,
  created_at, updated_at,
  -- app rule: insert only when now() >= events.starts_at
  unique(event_id, user_id)
)

collab_submissions(
  id, name, email, org, message, payload jsonb, handled bool default false,
  created_at
)
```

## Files (central registry)

```
files(
  id, owner_id -> users, blob_url, obscured_key unique,
  original_name, mime, size_bytes, entity_type(file_entity), entity_id,
  width, height, created_at, deleted_at
)
```

## Scavenger hunts

```
scavenger_hunts(
  id, event_id -> events (nullable: standalone/remote ok), slug unique,
  title, description, mode('in_person'|'remote'|'hybrid'),
  starts_at, ends_at, active bool, created_by -> users, created_at, updated_at
)

hunt_steps(
  id, hunt_id -> scavenger_hunts, sort int, type(step_type),
  title, prompt, points int default 10,
  config jsonb,        -- type-specific (answer, qr token, lat/lng/radius, choices...)
  requires_prev bool default true,   -- sequential vs free order
  created_at, updated_at
)

hunt_progress(
  id, hunt_id -> scavenger_hunts, step_id -> hunt_steps, user_id -> users,
  completed_at, payload jsonb,        -- submitted answer / proof file id / geo fix
  points_awarded int,
  unique(step_id, user_id)
)
```

`config` examples by `type`:
- `qr_scan`   → `{ "uplink": "<signed-token>" }`
- `riddle`    → `{ "answer": "norm", "fuzzy": true }`
- `geo_checkpoint` → `{ "lat":..., "lng":..., "radius_m": 50 }`
- `trivia_gate` → `{ "choices": [...], "correct": 2, "time_limit_s": 30 }`
- `photo_proof` → `{ "auto_approve": false }`
- `unlock_code` → `{ "code": "ALPHA-7" }`

## Gamification

```
squadrons(            -- one per division, plus seasons
  id, division unique, name, emblem_file_id -> files
)

seasons(
  id, name, starts_at, ends_at, active bool
)

squadron_scores(
  id, season_id -> seasons, division, points int default 0,
  updated_at, unique(season_id, division)
)

badges(
  id, code unique, name, description, icon, tier('bronze'|'silver'|'gold'|'legendary'),
  criteria jsonb
)

user_badges(
  id, user_id -> users, badge_id -> badges, awarded_at, unique(user_id, badge_id)
)

xp_ledger(            -- append-only, source of truth for users.xp
  id, user_id -> users, delta int, reason, ref_type, ref_id, created_at
)
```

## Arcade

```
games(
  id, slug unique, title, description, active bool, division
)

game_scores(
  id, game_id -> games, user_id -> users, score int, meta jsonb, created_at
)
-- leaderboards = top scores per game (and per season)
```

## Logging

```
activity_log(
  id, actor_id -> users (null for anon), action, entity_type, entity_id,
  metadata jsonb, ip, user_agent, request_id, created_at
)

error_log(
  id, level(log_level), message, stack, route, actor_id -> users (null),
  metadata jsonb, request_id, created_at
)

page_hits(
  id, path, actor_id -> users (null), referrer, session_id, ip, user_agent, created_at
)
```

Indexes to add: `activity_log(created_at)`, `activity_log(actor_id)`,
`page_hits(path, created_at)`, `hunt_progress(hunt_id, user_id)`,
`game_scores(game_id, score desc)`, `events(starts_at, ends_at)`.
