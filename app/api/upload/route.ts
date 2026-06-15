import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { files, fileEntityEnum } from "@/lib/db/schema";

type Entity = (typeof fileEntityEnum.enumValues)[number];
// values that actually exist in the DB enum (coerce anything else → "misc")
const VALID_ENTITY = new Set<Entity>(fileEntityEnum.enumValues);

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be signed in to upload." },
      { status: 401 }
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[upload] BLOB_READ_WRITE_TOKEN is not set in this environment");
    return NextResponse.json(
      { error: "Uploads are not configured on the server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: 15 * 1024 * 1024,
        tokenPayload: JSON.stringify({
          userId: session.user!.id,
          entityType: clientPayload ?? "misc",
        }),
      }),
      // Fires server-side once the blob lands (deployed callback only).
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const meta = tokenPayload
            ? (JSON.parse(tokenPayload) as { userId?: string; entityType?: string })
            : {};
          const entityType: Entity = VALID_ENTITY.has(meta.entityType as Entity)
            ? (meta.entityType as Entity)
            : "misc";
          await db.insert(files).values({
            ownerId: meta.userId ?? null,
            blobUrl: blob.url,
            obscuredKey: blob.pathname,
            originalName: blob.pathname.split("/").pop() ?? null,
            mime: blob.contentType ?? null,
            entityType,
          });
        } catch (err) {
          console.error("[upload] failed to record file row", err);
        }
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("[upload] handleUpload failed", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
