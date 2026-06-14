import { recentActivity, recentErrors, recentHits, type LogRow } from "@/lib/admin";

function Stream({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: LogRow[];
  accent: string;
}) {
  return (
    <div className="mm-glass p-4">
      <h2
        className="mb-3 font-[family-name:var(--font-display)] text-sm uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--mm-text-dim)]">No entries.</p>
      ) : (
        <ul className="space-y-2 font-[family-name:var(--font-mono)] text-xs">
          {rows.map((r) => (
            <li key={r.id} className="border-b border-[var(--mm-border)] pb-2">
              <p className="truncate text-[var(--mm-text)]">{r.primary}</p>
              <p className="truncate text-[var(--mm-text-dim)]">
                {r.secondary} · {new Date(r.createdAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function TelemetryPage() {
  const [activity, errors, hits] = await Promise.all([
    recentActivity(40),
    recentErrors(40),
    recentHits(40),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Command <span className="mm-gradient-text">telemetry</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          The black-box recorder — every action, error and page hit on the
          platform.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Stream title="Activity" rows={activity} accent="var(--mm-gold)" />
        <Stream title="Errors" rows={errors} accent="var(--mm-danger)" />
        <Stream title="Page hits" rows={hits} accent="var(--mm-violet)" />
      </div>
    </div>
  );
}
