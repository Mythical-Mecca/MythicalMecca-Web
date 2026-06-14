import Link from "next/link";
import { listGames } from "@/lib/arcade";

export default function ArcadePage() {
  const games = listGames();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Arcade <span className="mm-gradient-text">bay</span>
        </h1>
        <p className="mt-2 text-[var(--mm-text-dim)]">
          Training simulators. Top the leaderboard, earn XP.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/arcade/${g.slug}`}
            className="mm-glass group p-6 transition hover:border-[var(--mm-violet)]"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl group-hover:text-[var(--mm-gold)]">
              {g.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              {g.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
