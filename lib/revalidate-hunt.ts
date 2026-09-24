import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { scavengerHunts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Player pages and the organiser roster both read this hunt. */
export function revalidateHunt(slug: string) {
  revalidatePath(`/quests/${slug}`);
  revalidatePath(`/admin/quests/${slug}`);
  revalidatePath("/admin/quests");
}

/** A new handle at an event belongs on every quest attached to it. */
export async function revalidateHuntsForEvent(eventId: string) {
  revalidatePath("/admin/quests");
  try {
    const hunts = await db
      .select({ slug: scavengerHunts.slug })
      .from(scavengerHunts)
      .where(eq(scavengerHunts.eventId, eventId));
    for (const h of hunts) {
      revalidatePath(`/quests/${h.slug}`);
      revalidatePath(`/admin/quests/${h.slug}`);
    }
  } catch {
    // Sign-in already succeeded; a missed revalidate is a stale roster, not
    // a failed join. The admin page is also force-dynamic, so a refresh
    // still reads the new row.
  }
}
