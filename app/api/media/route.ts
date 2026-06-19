import { get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Streams a PRIVATE Vercel Blob through our own origin so it can be shown in
 * <img>/next-image. Private blobs have no public URL — the only way to read one
 * is `get(pathname, { access: "private" })` with the store's read-write token.
 *
 * These are public display assets (avatars, vendor galleries, banners), so there
 * is no per-user gate — the unguessable pathname is the capability. We support
 * conditional requests (ETag/If-None-Match → 304) to avoid re-streaming bytes.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.searchParams.get("pathname");
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[media] BLOB_READ_WRITE_TOKEN missing — cannot read private blob");
    return new NextResponse("Media not configured", { status: 503 });
  }

  try {
    const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
    const result = await get(pathname, { access: "private", ifNoneMatch });

    if (!result) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        // Unique (uuid) pathnames → content never changes for a given URL.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[media] failed to stream blob", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
