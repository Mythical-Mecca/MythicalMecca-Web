import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { files, fileEntityEnum } from "@/lib/db/schema";

type Entity = (typeof fileEntityEnum.enumValues)[number];

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const session = await auth();

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!session?.user) throw new Error("Unauthorized");
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            entityType: clientPayload ?? "misc",
          }),
        };
      },
      // Fires server-side once the blob lands (production callback).
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const meta = tokenPayload
            ? (JSON.parse(tokenPayload) as {
                userId?: string;
                entityType?: Entity;
              })
            : {};
          await db.insert(files).values({
            ownerId: meta.userId ?? null,
            blobUrl: blob.url,
            obscuredKey: blob.pathname,
            originalName: blob.pathname.split("/").pop() ?? null,
            mime: blob.contentType ?? null,
            entityType: meta.entityType ?? "misc",
          });
        } catch (err) {
          console.error("[upload] failed to record file", err);
        }
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
