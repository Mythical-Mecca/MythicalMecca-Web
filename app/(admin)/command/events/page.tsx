import { listEvents } from "@/lib/admin";
import { createEvent } from "../../actions";
import {
  Field,
  FormCard,
  PageHeader,
  inputCls,
  textareaCls,
} from "@/components/form";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/lib/format";

const DIVISIONS = ["tabletop", "arcade", "otaku", "maker"] as const;
const ACCENT = "#5cc08c";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const events = await listEvents();
  const { created, error } = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gatherings"
        sub="Events — schedule feasts, tournaments and quests."
        icon="game-icons:campfire"
        accent={ACCENT}
      />

      {created && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Event scheduled.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not schedule — check inputs.
        </div>
      )}

      <FormCard title="New event" icon="mdi:plus" accent={ACCENT}>
        <form action={createEvent} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <input name="title" required placeholder="Event name" className={inputCls} />
          </Field>
          <Field label="Summary" hint="optional">
            <input name="summary" placeholder="One-liner" className={inputCls} />
          </Field>
          <Field label="Location" hint="optional">
            <input name="location" placeholder="Where" className={inputCls} />
          </Field>
          <Field label="Division" hint="optional">
            <select name="division" defaultValue="" className={`${inputCls} capitalize`}>
              <option value="">No division</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <div />
          <Field label="Starts">
            <input name="startsAt" type="datetime-local" required className={inputCls} />
          </Field>
          <Field label="Ends">
            <input name="endsAt" type="datetime-local" required className={inputCls} />
          </Field>
          <Field label="Details" hint="optional" className="sm:col-span-2">
            <textarea name="bodyMd" rows={4} placeholder="What's happening…" className={textareaCls} />
          </Field>
          <div className="sm:col-span-2">
            <button type="submit" className="mm-btn mm-btn-primary">
              <Icon icon="mdi:calendar-plus" width={16} /> Schedule event
            </button>
          </div>
        </form>
      </FormCard>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:calendar-month-outline" width={20} className="text-[var(--mm-text-dim)]" />
          Scheduled <span className="text-sm text-[var(--mm-text-dim)]">({events.length})</span>
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No events yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <div key={e.id} className="mm-glass p-4">
                <p className="font-medium">{e.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                  <Icon icon="mdi:clock-outline" width={14} />
                  {e.startsAt ? formatDateTime(e.startsAt) : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
