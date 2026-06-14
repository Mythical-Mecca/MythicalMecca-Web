import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getGameLeaderboard } from "@/lib/arcade";
import { ReactionGame } from "@/components/reaction-game";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();
  const leaderboard = await getGameLeaderboard(slug);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
      <div className="space-y-5">
        <div>
          <Link
            href="/arcade"
            className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
          >
            ← Arcade bay
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
            {game.title}
          </h1>
          <p className="mt-2 text-[var(--mm-text-dim)]">{game.description}</p>
        </div>

        {saved && (
          <p className="text-sm text-[var(--mm-live)]">
            Score logged · +5 XP. Nice reflexes.
          </p>
        )}

        {slug === "reaction" ? (
          <ReactionGame slug={slug} />
        ) : (
          <p className="text-sm text-[var(--mm-text-dim)]">
            This simulator is still booting.
          </p>
        )}
      </div>

      <aside className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-sm uppercase tracking-widest text-[var(--mm-gold)]">
          Best times
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-[var(--mm-text-dim)]">
            No scores yet — set the pace.
          </p>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((r, i) => (
              <li
                key={i}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span>
                  <span className="text-[var(--mm-text-dim)]">{i + 1}.</span>{" "}
                  {r.name}
                </span>
                <span className="text-[var(--mm-gold)]">{r.score} ms</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
