# Architecture

## Directory structure

```
app/
├─ (public)/                 # Recruit — public, SSR/SEO, flashy
│   ├─ page.tsx              # home
│   ├─ news/[slug]/
│   ├─ events/[id]/          # public event page
│   ├─ armory/               # vendor gallery
│   └─ collab/               # distress beacon form
├─ (app)/                    # Pilot — guarded (member+)
│   ├─ layout.tsx            # re-verifies session server-side
│   ├─ dashboard/
│   ├─ profile/
│   ├─ vendor-application/
│   └─ events/[id]/live/     # live sortie view
├─ (vendor)/                 # Forge — guarded (vendor+), dashboard shell
│   └─ forge/...
├─ (admin)/                  # Command — guarded (admin), dashboard shell
│   └─ command/...
├─ api/
│   ├─ auth/[...nextauth]/
│   ├─ upload/               # Vercel Blob client-token + finalize
│   ├─ hunt/scan/            # QR uplink verify
│   └─ log/hit/              # page-hit beacon
└─ actions/                  # server actions (mutations, deep authz)

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
  { prefix: "/command", min: "admin" },
  { prefix: "/forge",   min: "vendor" },
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

export const config = { matcher: ["/command/:path*","/forge/:path*","/dashboard/:path*","/profile/:path*"] };
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
BLOB_READ_WRITE_TOKEN=
ADMIN_EMAILS=                 # comma list bootstrapped to admin
QR_SIGNING_SECRET=
NEXT_PUBLIC_APP_URL=
```
