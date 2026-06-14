import Link from "next/link";
import { listHunts } from "@/lib/hunts";

export default async function HuntsPage() {
  const hunts = await listHunts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          <span className="mm-gradient-text">Quest</span> board
        </h1>
        <p className="mt-2 text-[var(--mm-text-dim)]">
          Scavenger quests — solve, seek and prove your way up the leaderboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {hunts.map((h) => (
          <Link
            key={h.slug}
            href={`/hunts/${h.slug}`}
            className="mm-glass group p-6 transition hover:border-[var(--mm-violet)]"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl group-hover:text-[var(--mm-gold)]">
              {h.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              {h.description}
            </p>
            <p className="mt-4 text-xs uppercase tracking-widest text-[var(--mm-gold)]">
              {h.steps} objectives
            </p>
          </Link>
        ))}
        {hunts.length === 0 && (
          <p className="text-sm text-[var(--mm-text-dim)]">
            No active hunts right now.
          </p>
        )}
      </div>
    </div>
  );
}
