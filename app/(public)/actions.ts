"use server";

import { z } from "zod";
import { recordGalleryView } from "@/lib/gallery";

/**
 * Public Server Functions — the only writes an unauthenticated visitor can
 * make from the marketing pages.
 */

/**
 * Count one open of a homepage gallery photo.
 *
 * Called by the viewer when a photo is opened, and deliberately silent: the
 * caller gets nothing back and shows nothing on failure, because a metric is
 * never worth interrupting someone looking at a picture.
 */
export async function countGalleryView(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  await recordGalleryView(id);
}

export async function publicSignOut(): Promise<void> {
  const { signOut } = await import("@/lib/auth");
  await signOut({ redirectTo: "/" });
}
