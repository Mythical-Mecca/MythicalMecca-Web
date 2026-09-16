import { NextResponse } from "next/server";
import { recordExternalSignup } from "@/lib/signup";

/**
 * Inbound webhook from an external sign-up form: "this handle registered".
 *
 * The secret in the path is the whole credential — see lib/signup.ts for why
 * it lives there. The body is JSON or a form post, and only two fields are
 * read from it. Everything else the form knows about the person stays on the
 * form's side; this endpoint never stores it and never logs it.
 *
 * Accepted keys (first one present wins, case as written):
 *   handle      — also `username`, `alias`, `player`
 *   externalId  — also `external_id`, `id`, `reference`, `ref`
 *
 * `name` is deliberately not an alias for the handle: on most forms that
 * field is the person's real name, and storing it here would put exactly the
 * data this event promised not to hold into our database.
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

  const handle = pick(body, HANDLE_KEYS);
  if (!handle) {
    return NextResponse.json(
      { ok: false, error: "missing_handle", expects: { handle: "string", externalId: "string?" } },
      { status: 400 }
    );
  }

  const result = await recordExternalSignup({
    secret,
    handle,
    externalId: pick(body, ID_KEYS),
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
