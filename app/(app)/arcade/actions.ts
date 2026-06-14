"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { gameScores } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { gameIdBySlug } from "@/lib/arcade";
import { awardXp } from "@/lib/gamification";
import { logActivity } from "@/lib/logging";

const schema = z.object({
  slug: z.string().min(1),
  score: z.coerce.number().int().min(0).max(60000),
});

export async function submitScore(formData: FormData) {
  const session = await auth();
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?from=/arcade/${slug}`);

  const parsed = schema.safeParse({
    slug,
    score: formData.get("score"),
  });
  if (!parsed.success) redirect(`/arcade/${slug}?error=1`);

  if (process.env.DATABASE_URL) {
    try {
      const gameId = await gameIdBySlug(slug);
      if (gameId) {
        await db.insert(gameScores).values({
          gameId,
          userId: session.user.id,
          score: parsed.data.score,
        });
        await awardXp(session.user.id, 5, "arcade", "game", slug);
      }
    } catch {
      redirect(`/arcade/${slug}?error=1`);
    }
  }
  await logActivity({ actorId: session.user.id, action: "arcade.score" });
  revalidatePath(`/arcade/${slug}`);
  redirect(`/arcade/${slug}?saved=1`);
}
