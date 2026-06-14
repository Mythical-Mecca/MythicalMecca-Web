export function SyncGauge({
  pct,
  rank,
}: {
  pct: number;
  rank: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--mm-gold) ${pct * 3.6}deg, var(--mm-elevated) 0deg)`,
        }}
      >
        <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-[var(--mm-bg)]">
          <span className="font-[family-name:var(--font-display)] text-lg text-[var(--mm-gold)]">
            {pct}%
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[var(--mm-text-dim)]">
            renown
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
          Rank
        </p>
        <p className="font-[family-name:var(--font-display)] text-xl">{rank}</p>
      </div>
    </div>
  );
}
