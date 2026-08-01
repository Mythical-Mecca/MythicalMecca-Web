# Architecture

## Directory structure

Removed features are deleted outright, not hidden — `next.config.ts` redirects
their old URLs to the nearest live section so nothing 404s. Restoring one means
recovering it from git history and writing a fresh migration.

Cut from the launch scope (code and tables deleted): **news**, **guilds**,
**lists**, **arcade**, **LFG** (LFG runs in Discord for now).

```
app/
├─ (public)/                 # public — strict one-pager, SSR/SEO, flashy
│   ├─ page.tsx              # the whole public site: about / events / gallery / partners
│   └─ collab/               # contact form
├─ (app)/                    # guarded (member+)
│   ├─ layout.tsx            # re-verifies session server-side
│   ├─ dashboard/
│   ├─ profile/
│   ├─ apply/                # partner application wizard
│   ├─ events/               # index + [slug] + submit
│   ├─ partners/             # index + [slug]
│   └─ quests/               # index + [slug] + scan
├─ (partner)/                # guarded (partner+), dashboard shell
│   └─ partner-hub/...
├─ (admin)/                  # guarded (admin), dashboard shell
│   └─ admin/...             # events, gallery, partners, reviews, telemetry
├─ api/
│   ├─ auth/[...nextauth]/
│   ├─ chat/[scopeType]/[scopeId]/   # polling chat
│   ├─ events/[slug]/ics/    # add-to-calendar
│   ├─ media/                # blob proxy (obscured keys)
│   └─ upload/               # Vercel Blob client-token + finalize
└─ login/

# Server actions live beside the routes that use them —
# app/(app)/events/actions.ts, app/(admin)/actions*.ts — not in a central folder.

lib/
├─ db/ (drizzle schema, client)
├─ auth.ts (Auth.js config)
├─ logging.ts (activity / error / hit helpers)
├─ blob.ts (upload, obscured keys)
├─ rbac.ts (role helpers, route→role map)
└─ qr.ts (sign / verify uplink tokens)

proxy.ts                     # edge gate (NOT middleware.ts)
```

## proxy.ts — cheap edge gate

Responsibilities (NO database calls):
- Read the session/JWT cookie; if absent on a guarded route → redirect to sign-in.
- Map the first path segment to a minimum role; compare against the role claim in the JWT.
- Basic hardening: security headers, simple bot/method checks, rate-limit hints.
- Attach a request id (used by logging downstream).

```ts
// proxy.ts (sketch)
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const RULES: { prefix: string; min: Role }[] = [
  { prefix: "/admin", min: "admin" },
  { prefix: "/partner-hub",   min: "vendor" },
  { prefix: "/dashboard", min: "member" },
  { prefix: "/profile",   min: "member" },
];

export async function proxy(req) {
  const path = req.nextUrl.pathname;
  const rule = RULES.find(r => path.startsWith(r.prefix));
  if (!rule) return withSecurityHeaders(NextResponse.next());

  const token = await getToken({ req }); // reads JWT cookie, no DB
  if (!token) return NextResponse.redirect(new URL("/api/auth/signin", req.url));
  if (!roleAtLeast(token.role, rule.min))
    return NextResponse.redirect(new URL("/dashboard?denied=1", req.url));

  return withSecurityHeaders(NextResponse.next());
}

export const config = { matcher: ["/admin/:path*","/partner-hub/:path*","/dashboard/:path*","/profile/:path*"] };
```

> Defense in depth: `proxy.ts` is the fast gate. Each guarded route group's
> `layout.tsx` re-checks the session server-side, and server actions verify
> **resource ownership** (does *this* vendor own *this* file/gallery item).

## Auth.js v5

- Google provider only (for now).
- On sign-in, look up/create the user, attach `role` to the JWT and session.
- Default new users → `member`. Promotion to `vendor` happens on application approval;
  `admin` is set manually / via allowlist env.

```ts
callbacks: {
  jwt: ({ token, user }) => { if (user) token.role = user.role; return token; },
  session: ({ session, token }) => { session.user.role = token.role; return session; },
}
```

## Authorization layers

1. **proxy.ts** — is there a session? does the JWT role clear the route's minimum?
2. **Route layout** — server-side `auth()` re-validation, fetch fresh role.
3. **Server action / API** — ownership + business rules before any mutation.

## Logging architecture ("thorough")

Three streams, all queryable from the Command telemetry viewer:

- **activity_log** — every meaningful action (login, post create, application submit,
  hunt step complete, file upload). Fields: actor, action, entity type/id, metadata jsonb, ip, ua, request_id, ts.
- **error_log** — server/client errors: level, message, stack, route, actor, request_id, ts.
  Wire a React error boundary + a global handler that POSTs to `/api/log/error`.
- **page_hits** — lightweight navigation beacon (`/api/log/hit`): path, actor (nullable),
  referrer, session id, ts. Aggregate later for dashboards.

Helper API (server): `logActivity({...})`, `logError(e, ctx)`. Fire-and-forget where safe;
never block the user path on logging. Batch page hits.

## File upload pipeline

1. Client requests an upload token from `/api/upload` (validates mime/size, role).
2. Upload directly to **Vercel Blob** with `addRandomSuffix` / a generated UUID key so
   the public pathname is **obscured** (never the original filename).
3. On success, finalize: insert a row into `files` (id, blob_url, obscured_key,
   original_name, mime, size, owner_id, entity_type, entity_id, ts).
4. UI shows a **detailed progress bar** (per-file %, speed, cancel) using the upload
   event stream; multiple files supported.

All references elsewhere (gallery images, photo-proof hunt steps, post media) point to
`files.id`, never a raw blob URL — single source of truth, easy cleanup/audit.

## Environment variables

```
DATABASE_URL=                 # Neon pooled (used for app + migrations)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
# Vercel Blob auth — EITHER the classic RW token...
BLOB_READ_WRITE_TOKEN=
# ...OR the newer store model (BLOB_STORE_ID + VERCEL_OIDC_TOKEN, auto-injected
# on Vercel; BLOB_WEBHOOK_PUBLIC_KEY verifies the upload-completed webhook).
BLOB_STORE_ID=
BLOB_WEBHOOK_PUBLIC_KEY=
ADMIN_EMAILS=                 # comma list bootstrapped to admin
QR_SIGNING_SECRET=
# Optional: enables Google Places autocomplete on the event location field.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_APP_URL=
```
