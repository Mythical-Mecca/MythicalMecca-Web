import { NextResponse } from "next/server";
import { isLiveSignupSecret, recordExternalSignup } from "@/lib/signup";

/**
 * Inbound webhook from an external sign-up form: "this handle registered".
 *
 * The secret in the path is the whole credential — see lib/signup.ts for why
 * it lives there. The body is JSON or a form post, and only two fields are
 * read from it. Everything else the form knows about the person stays on the
 * form's side; this endpoint never stores it and never logs it.
 *
 * Two dialects are understood:
 *
 * **Plain** — a flat JSON or form body. First key present wins:
 *   handle      — also `username`, `alias`, `player`
 *   externalId  — also `external_id`, `id`, `reference`, `ref`
 *
 * **monday.com** — the shape its board webhooks send. Subscribing starts with
 * a handshake: a POST of `{ "challenge": "…" }` that must be echoed back
 * as-is with a 200, or monday refuses the URL. After that every event is
 * `{ "event": { pulseName, pulseId, value?, … } }`. The item name
 * (`pulseName`) is taken as the handle, so the board's form must make the
 * player's username the item name; `pulseId` becomes the reference. A
 * column-change event carries the new text in `value.text` instead.
 *
 * `name` is deliberately not an alias for the handle in the plain dialect:
 * on most forms that field is the person's real name, and storing it here
 * would put exactly the data this event promised not to hold into our
 * database.
 *
 * Answers 202 with `{ ok, matched }` so a test post from the form builder
 * tells the organiser whether the handle already belongs to a player.
 */

const MAX_BODY_BYTES = 16 * 1024;

const HANDLE_KEYS = ["handle", "username", "alias", "player"];
const ID_KEYS = ["externalId", "external_id", "id", "reference", "ref"];

function pick(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return null;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const parsed = await req.json();
      return parsed && typeof parsed === "object" ? parsed : null;
    }
    if (
      type.includes("application/x-www-form-urlencoded") ||
      type.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      const out: Record<string, unknown> = {};
      form.forEach((v, k) => {
        if (typeof v === "string") out[k] = v;
      });
      return out;
    }
    // No usable content type: try JSON anyway, since some tools omit it.
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return null;
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The handle and reference out of a monday.com event envelope, or null when
 * the body isn't one. Item creation carries the name; a column change
 * carries the new value; both carry the item id.
 */
function fromMonday(
  body: Record<string, unknown>
): { handle: string; externalId: string | null } | null {
  const event = body.event;
  if (!event || typeof event !== "object") return null;
  const e = event as Record<string, unknown>;
  const value =
    e.value && typeof e.value === "object"
      ? (e.value as Record<string, unknown>)
      : null;
  const handle =
    (typeof e.pulseName === "string" && e.pulseName.trim()) ||
    (value && typeof value.text === "string" && value.text.trim()) ||
    (value && typeof value.name === "string" && value.name.trim()) ||
    null;
  if (!handle) return null;
  const id = e.pulseId ?? e.itemId;
  return {
    handle,
    externalId:
      typeof id === "number" || typeof id === "string" ? String(id) : null,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  const body = await readBody(req);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "bad_body", expects: { handle: "string", externalId: "string?" } },
      { status: 400 }
    );
  }

  // monday.com's subscription handshake: echo the token or the URL is
  // refused. Only for a live secret — a wrong one learns nothing, as below.
  if (typeof body.challenge === "string") {
    if (!(await isLiveSignupSecret(secret))) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ challenge: body.challenge });
  }

  const monday = fromMonday(body);
  const handle = monday?.handle ?? pick(body, HANDLE_KEYS);
  if (!handle) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_handle",
        expects: { handle: "string", externalId: "string?" },
        hint: "monday.com: make the player's username the item name.",
      },
      { status: 400 }
    );
  }

  const result = await recordExternalSignup({
    secret,
    handle,
    externalId: monday ? monday.externalId : pick(body, ID_KEYS),
  });

  if (!result.ok) {
    if (result.reason === "unknown_secret") {
      // Same shape as a route that doesn't exist: a wrong secret learns nothing.
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    if (result.reason === "bad_handle") {
      return NextResponse.json({ ok: false, error: "bad_handle" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { ok: true, matched: result.matched, handle: result.handle },
    { status: 202 }
  );
}

/** Opening the URL in a browser: say what it is for, without confirming the secret. */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "post_only",
      expects: { handle: "string", externalId: "string?" },
    },
    { status: 405, headers: { allow: "POST" } }
  );
}
