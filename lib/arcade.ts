import "server-only";
import { db } from "@/lib/db";
import { games, gameScores, users } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";

const useDb = !!process.env.DATABASE_URL;

export const SAMPLE_GAMES = [
  {
    slug: "reaction",
    title: "Reaction Sim",
    description:
      "Wait for the reticle to lock, then fire. Fastest reflexes top the board.",
  },
];

export function listGames() {
  return SAMPLE_GAMES;
}

export function getGame(slug: string) {
  return SAMPLE_GAMES.find((g) => g.slug === slug) ?? null;
}

export async function gameIdBySlug(slug: string): Promise<string | null> {
  if (!useDb) return null;
  try {
    const [g] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, slug))
      .limit(1);
    return g?.id ?? null;
  } catch {
    return null;
  }
}

export interface ScoreRow {
  name: string;
  score: number;
}

/** Best (lowest ms) reaction time per pilot. */
export async function getGameLeaderboard(slug: string): Promise<ScoreRow[]> {
  if (!useDb) return [];
  try {
    const id = await gameIdBySlug(slug);
    if (!id) return [];
    const rows = await db
      .select({
        name: users.name,
        best: sql<number>`min(${gameScores.score})`,
      })
      .from(gameScores)
      .innerJoin(users, eq(users.id, gameScores.userId))
      .where(eq(gameScores.gameId, id))
      .groupBy(users.name)
      .orderBy(asc(sql`min(${gameScores.score})`))
      .limit(10);
    return rows.map((r) => ({ name: r.name ?? "Adventurer", score: Number(r.best) }));
  } catch {
    return [];
  }
}
