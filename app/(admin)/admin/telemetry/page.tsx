import { recentActivity, recentErrors, recentHits, type LogRow } from "@/lib/admin";
import { PageHeader } from "@/components/form";

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
      <PageHeader
        title="Logs"
        sub="Logs & activity — every deed, mishap and footstep across the hall."
        icon="game-icons:book-cover"
        accent="#48c8d6"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Stream title="Activity" rows={activity} accent="var(--mm-gold)" />
        <Stream title="Errors" rows={errors} accent="var(--mm-danger)" />
        <Stream title="Page hits" rows={hits} accent="var(--mm-violet)" />
      </div>
    </div>
  );
}
