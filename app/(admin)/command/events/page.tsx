import { listEvents } from "@/lib/admin";
import { createEvent } from "../../actions";
import { formatDateTime } from "@/lib/format";

const DIVISIONS = ["tabletop", "arcade", "otaku", "maker"] as const;

const inputCls =
  "w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const events = await listEvents();
  const { created, error } = await searchParams;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Events
      </h1>

      {created && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Op scheduled.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not schedule — check inputs.
        </div>
      )}

      <section className="mm-glass p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg">
          New op
        </h2>
        <form action={createEvent} className="space-y-4">
          <input name="title" required placeholder="Title" className={inputCls} />
          <input
            name="summary"
            placeholder="Summary"
            className={inputCls}
          />
          <input
            name="location"
            placeholder="Location"
            className={inputCls}
          />
          <select name="division" defaultValue="" className={`${inputCls} capitalize`}>
            <option value="">No division</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[var(--mm-text-dim)]">
              Starts
              <input
                name="startsAt"
                type="datetime-local"
                required
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className="text-sm text-[var(--mm-text-dim)]">
              Ends
              <input
                name="endsAt"
                type="datetime-local"
                required
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>
          <textarea
            name="bodyMd"
            rows={5}
            placeholder="Details"
            className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--mm-violet)]"
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            Create event
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Scheduled
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No events yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span>{e.title}</span>
                <span className="text-xs text-[var(--mm-text-dim)]">
                  {e.startsAt ? formatDateTime(e.startsAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
