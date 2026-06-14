# Mythic Mecha 2.0

A sci-fi themed homebase for the geek community. Members are **Pilots**; the site is
their hangar/cockpit. See [PLAN.md](PLAN.md) and [`docs/`](docs/) for the full design.

## Stack

Next.js 16 (App Router, `proxy.ts`) · Neon Postgres · Drizzle ORM · Auth.js v5 (Google) ·
Vercel Blob · Tailwind v4. Theme: gold primary, blue→purple gradient, navy/purple darks.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

### Required setup (before login / DB features work)

1. **Neon** — create a project and paste the connection string into `.env`:
   - `DATABASE_URL` (pooled connection string)
2. **Push the schema** once `DATABASE_URL` is set, then seed sample content:
   ```bash
   pnpm db:push          # or: pnpm db:migrate to apply ./drizzle/*.sql
   pnpm db:seed          # badges, arcade game, posts, events, a vendor, a hunt
   ```
   > Until a database is connected the app runs on built-in dev sample data, so
   > every page renders — DB-backed writes just no-op.
3. **Google OAuth** — create an OAuth client (Authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google`) and set `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET`.
4. `AUTH_SECRET` is already generated in `.env.local`. `ADMIN_EMAILS` controls who is
   bootstrapped to the admin role on login.

See [`.env.example`](.env.example) for the full list.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate SQL migration from schema |
| `pnpm db:push` | Push schema directly to the DB |
| `pnpm db:migrate` | Apply generated migrations |
| `pnpm db:studio` | Drizzle Studio |

## Structure

```
app/(public)/   Recruit — public pages (home, news, events, armory, collab)
app/(app)/      Pilot — guarded member area (dashboard, profile)
app/(vendor)/   Forge — guarded vendor dashboard
app/(admin)/    Command — guarded admin dashboard
proxy.ts        Edge auth/role gate (no DB)
lib/            db (Drizzle), auth, rbac, guard, logging
docs/           architecture, data-model, design-system, features
```

## Roadmap

Phase 0 Foundation ✅ → 1 Public site → 2 Member + files → 3 Vendor + Admin →
4 Events live layer → 5 Scavenger hunts + gamification. Details in [PLAN.md](PLAN.md).
