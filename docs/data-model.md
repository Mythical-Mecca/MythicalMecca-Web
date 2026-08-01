# Data model

Postgres via Drizzle. Naming: `snake_case` columns, `id` = `uuid` default
`gen_random_uuid()`, timestamps `created_at` / `updated_at` (tz). Soft-delete via
`deleted_at` where useful.

> **Source of truth is the code, not this file.**
> [`lib/db/schema.ts`](../lib/db/schema.ts) defines the schema;
> [`drizzle/0000_baseline.sql`](../drizzle/0000_baseline.sql) is the generated DDL
> and always matches the live database. This page is a map of *what exists and
> why* — go to those two for column-level detail. An earlier version of this file
> duplicated every column and rotted badly (it still described `badges`, `games`,
> `posts` and a `vendor` role long after they were gone), so keep it descriptive.

## Migrations

History was squashed on 2026-07-30 into a single `0000_baseline`; see
[`db-archive/pre-squash-2026-07-30/README.md`](../db-archive/pre-squash-2026-07-30/README.md)
for why. Normal workflow now works:

```bash
pnpm db:generate
```

`drizzle-kit check` validates the folder; `pnpm db:migrate` applies. Note
`db:generate` exits non-zero when there's nothing to do, despite printing
"No schema changes" — don't wire it into CI as a pass/fail gate without
allowing for that.

## Enums (11)

Every one is referenced by a live column.

```
role              : member | partner | admin        -- user.role ("recruit" = no row)
app_status        : draft | pending | approved | rejected
event_status      : draft | published | live | ended | cancelled | pending | rejected
event_origin      : hosted | partner | external | community
chat_scope        : event                           -- discriminator; only events chat today
file_entity       : avatar | event | partner_gallery | hunt_proof | misc
gallery_kind      : art | product
hunt_mode         : in_person | remote | hybrid
step_type         : qr_scan | riddle | crossword | cipher | geo_checkpoint
                    | photo_proof | trivia_gate | unlock_code
review_target     : site | partner
log_level         : debug | info | warn | error | fatal
```

Changing an enum's values is awkward in Postgres — you cannot drop a value in
place. Rename the type, recreate it without the value, re-point the column with
`USING col::text::newtype`, then drop the old type.

## Tables (24)

**Identity** — `user`, `account`, `session`, `verificationToken`
Auth.js adapter tables plus Mythical Mecca columns on `user` (role, avatar).

**Events** — `events`, `event_comments`, `event_reviews`, `event_interests`,
`event_gallery_items`
`events.origin` drives how an event renders: `hosted` (ours), `partner`
(endorsed, links to `partners`), `external` (link-out, no RSVP), `community`
(member-submitted, moderated via `status` = `pending` → `published`/`rejected`).

**Partners** — `partners`, `partner_categories`, `partner_applications`,
`partner_gallery_items`
The category carries the display toggles (`show_products`, `show_art`, …), so a
partner's page shape follows from its category.

**Quests** — `scavenger_hunts`, `hunt_steps`, `hunt_progress`
`hunt_steps.config` is type-specific JSON:

- `qr_scan` → `{ "uplink": "<signed-token>" }`
- `riddle` → `{ "answer": "norm", "fuzzy": true }`
- `geo_checkpoint` → `{ "lat":…, "lng":…, "radius_m": 50 }`
- `trivia_gate` → `{ "choices": [...], "correct": 2, "time_limit_s": 30 }`
- `photo_proof` → `{ "auto_approve": false }`
- `unlock_code` → `{ "code": "ALPHA-7" }`

**Content & misc** — `gallery_items` (homepage), `files` (central blob registry
with obscured keys), `chat_messages`, `reviews` (site + partner testimonials,
approvable), `collab_submissions` (contact form)

**Logging** — `activity_log`, `error_log`, `page_hits`

## Removed features

Cut for launch on 2026-07-30, all folded into the baseline: news/`posts`,
guilds (`guilds`, `guild_members`, `guild_events`), community lists (`lists`,
`list_entries`, `list_entry_votes`, `list_comments`, `list_suggestions`), and
the arcade (`games`, `game_scores`). Gamification (`badges`, `user_badges`,
`squadrons`, xp/sync_rate) went earlier. LFG (`lfg_posts`, `lfg_members`) was
dropped in `0001_drop_lfg` — it runs in Discord for now.

Restoring any of them means recovering the schema block from git history and
writing a fresh migration — there is no down path.
