import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { galleryItems, galleryItemViews } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const useDb = !!process.env.DATABASE_URL;

/**
 * The anonymous half of a viewer's identity.
 *
 * The homepage gallery is public, so most viewers have no account to count
 * them by. A random id in a first-party cookie is the closest honest answer:
 * it survives a reload, it is not derived from anything about the person, and
 * clearing cookies genuinely resets it. Deliberately NOT an IP or a
 * user-agent fingerprint — those either collapse a whole household into one
 * viewer or quietly build a profile we have no reason to hold.
 */
const VIEWER_COOKIE = "mm_gv";
const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // a year

/**
 * Who is looking, for the purposes of "have we counted them already".
 *
 * A signed-in member is counted as themselves on every device — anyone else is
 * counted per browser. The cookie is created here on first sight, which is why
 * this can only run inside a Server Function or Route Handler.
 */
async function viewerKey(): Promise<{ key: string; userId: string | null }> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (userId) return { key: `user:${userId}`, userId };

  const jar = await cookies();
  const existing = jar.get(VIEWER_COOKIE)?.value;
  if (existing) return { key: `anon:${existing}`, userId: null };

  const fresh = randomUUID();
  jar.set(VIEWER_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VIEWER_COOKIE_MAX_AGE,
  });
  return { key: `anon:${fresh}`, userId: null };
}

export interface GalleryViewCounts {
  views: number;
  uniqueViews: number;
}

/**
 * Count one open of a gallery photo.
 *
 * Every open adds to `views`; a viewer's first ever open of that photo also
 * adds to `unique_views`. Uniqueness is decided by the insert into
 * `gallery_item_views` rather than by a read-then-write, so two clicks racing
 * each other can't both come back "never seen before" — the unique index
 * settles it and only the winner reports a row.
 *
 * Never throws: a photo failing to be counted must not stop it being shown.
 */
export async function recordGalleryView(
  itemId: string
): Promise<GalleryViewCounts | null> {
  if (!useDb) return null;

  try {
    const { key, userId } = await viewerKey();

    const inserted = await db
      .insert(galleryItemViews)
      .values({ itemId, viewerKey: key, userId })
      .onConflictDoNothing()
      .returning({ id: galleryItemViews.id });

    const isFirst = inserted.length > 0;

    const [row] = await db
      .update(galleryItems)
      .set({
        views: sql`${galleryItems.views} + 1`,
        uniqueViews: sql`${galleryItems.uniqueViews} + ${isFirst ? 1 : 0}`,
      })
      .where(eq(galleryItems.id, itemId))
      .returning({
        views: galleryItems.views,
        uniqueViews: galleryItems.uniqueViews,
      });

    return row ?? null;
  } catch (err) {
    console.error("[gallery] view not counted", err);
    return null;
  }
}
