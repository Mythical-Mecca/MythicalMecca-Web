import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { getPrintPack } from "@/lib/print-pack";
import { StationPackDocument } from "@/lib/pdf/station-pack";

/**
 * The station pack as a downloadable PDF.
 *
 * A route handler rather than a page, and guarded on its own: layouts do not
 * wrap route handlers, so the `requireRole` in the admin layout never runs
 * here. It answers with status codes instead of the layout's redirects — a
 * redirect to /login is a nonsense response to a file request.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Measured at roughly 0.4s a sheet — font parsing, the QR bitmaps and the Blob
 * reads for partner logos. A twenty-stand trail therefore lands near the
 * platform's default ceiling, and a pack that times out half-rendered is worse
 * than one that takes a while.
 */
export const maxDuration = 60;

/** Filename-safe, so a folder of downloaded packs stays identifiable. */
function slugifyForFile(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "station-pack"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!roleAtLeast(session.user.role, "admin")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { slug } = await params;
  // Images have to be bytes in hand: the renderer has no browser and no
  // session, and partner logos live in a private Blob store.
  const pack = await getPrintPack(slug, { embedImages: true });
  if (!pack) return new Response("Not found", { status: 404 });

  const only = new URL(request.url).searchParams.get("only");
  const pages =
    only === "stations" ? pack.pages.filter((p) => p.tagQr) : pack.pages;

  if (pages.length === 0) {
    return new Response("This quest has no objectives to print.", {
      status: 409,
    });
  }

  const body = await renderToBuffer(
    <StationPackDocument pack={pack} pages={pages} />
  );

  const name = `${slugifyForFile(pack.title)}-station-pack${
    only === "stations" ? "-stands" : ""
  }.pdf`;

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(body.length),
      // Codes and partner details change when the quest is edited, and a stale
      // pack is one that sends people to the wrong stand.
      "Cache-Control": "no-store",
    },
  });
}
