import { NextResponse } from "next/server";
import {
  disableChannel,
  verifyUnsubscribeToken,
  type Channel,
} from "@/lib/notifications";

/**
 * The endpoint behind the unsubscribe link in our messages.
 *
 * GET does NOT unsubscribe. It renders a page with one button, and the button
 * POSTs. That split matters: mail providers, link scanners and corporate
 * security gateways fetch every URL in an email before the recipient sees it,
 * and a GET that mutates would unsubscribe people who never clicked anything.
 *
 * POST is also what RFC 8058 one-click asks for, so the same route can back a
 * `List-Unsubscribe` header later without changing.
 *
 * No session is involved. The signed token in the link is the whole
 * credential — see lib/notifications.ts for why, and for how little it grants.
 */

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "emails",
  inApp: "in-app notifications",
  discord: "Discord messages",
};

function page(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notification settings — Mythical Mecca</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f1c;
       color:#e8ecf8;font:16px/1.6 ui-sans-serif,system-ui,sans-serif;padding:24px}
  main{max-width:32rem;text-align:center}
  h1{font-size:1.5rem;margin:0 0 .5rem}
  p{color:#9aa3bd;margin:0 0 1.5rem}
  button,a.btn{display:inline-block;border:0;border-radius:12px;padding:12px 20px;
       background:#E18D01;color:#0b0f1c;font-weight:600;font-size:1rem;cursor:pointer;
       text-decoration:none}
  a.quiet{color:#9aa3bd;font-size:.875rem}
</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

const UNKNOWN = page(
  `<h1>That link has expired</h1>
   <p>We could not read that unsubscribe link. You can change what we send you
      from your profile at any time.</p>
   <a class="btn" href="/profile">Open your profile</a>`,
  400
);

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const claim = verifyUnsubscribeToken(token);
  if (!claim) return UNKNOWN;

  const label = CHANNEL_LABEL[claim.channel];
  return page(
    `<h1>Stop sending ${label}?</h1>
     <p>You will still be able to see everything in the app, and you can turn
        ${label} back on from your profile whenever you like.</p>
     <form method="post">
       <input type="hidden" name="t" value="${token.replace(/"/g, "&quot;")}">
       <button type="submit">Unsubscribe me</button>
     </form>
     <p style="margin-top:1.5rem"><a class="quiet" href="/profile">Change my settings instead</a></p>`
  );
}

export async function POST(req: Request) {
  // The token arrives from the form on the GET page, or as a query param for
  // a one-click client that POSTs the URL it was given.
  let token = new URL(req.url).searchParams.get("t") ?? "";
  if (!token) {
    try {
      const form = await req.formData();
      token = String(form.get("t") ?? "");
    } catch {
      token = "";
    }
  }

  const claim = verifyUnsubscribeToken(token);
  if (!claim) return UNKNOWN;

  const ok = await disableChannel(claim.userId, claim.channel);
  if (!ok) {
    return page(
      `<h1>Something went wrong</h1>
       <p>We could not save that just now. Please try again, or change it from
          your profile.</p>
       <a class="btn" href="/profile">Open your profile</a>`,
      500
    );
  }

  return page(
    `<h1>Done</h1>
     <p>We have stopped sending you ${CHANNEL_LABEL[claim.channel]}. Turn them
        back on from your profile whenever you want them again.</p>
     <a class="btn" href="/profile">Open your profile</a>`
  );
}
