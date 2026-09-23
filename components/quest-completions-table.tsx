"use client";

import { useMemo, useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { formatDate, formatDateTime } from "@/lib/format";
import { deleteQuestParticipants } from "@/app/(admin)/actions";

export interface CompletionRow {
  id: string;
  name: string;
  points: number;
  cleared: number;
  listed: number;
  finished: boolean;
  /** ISO instant of the last check-in. */
  lastAt: string;
  signupState: "confirmed" | "claimed" | "none" | null;
}

/**
 * Completions for one quest: a selectable table so an organiser can export
 * the field, wipe mistaken check-ins, and — with Group by day — pick a
 * winner from whoever was last active on each calendar day.
 */
export function QuestCompletionsTable({
  questSlug,
  rows,
  accent,
}: {
  questSlug: string;
  rows: CompletionRow[];
  accent: string;
}) {
  const [groupByDay, setGroupByDay] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, startBulk] = useTransition();

  const columns = useMemo<DataTableColumn<CompletionRow>[]>(
    () => [
      {
        key: "name",
        header: "Adventurer",
        icon: "game-icons:hood",
        value: (r) => r.name,
        width: "16rem",
        render: (r) => (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.name}</span>
            {r.finished && (
              <Badge color="var(--mm-live)" icon="mdi:flag-checkered">
                Finished
              </Badge>
            )}
            {r.signupState === "confirmed" && (
              <Badge color="var(--mm-live)" icon="mdi:clipboard-check-outline">
                Signed up
              </Badge>
            )}
            {r.signupState === "claimed" && (
              <Badge color="var(--mm-gold)" icon="mdi:clipboard-text-outline">
                Says signed up
              </Badge>
            )}
          </span>
        ),
      },
      {
        key: "cleared",
        header: "Cleared",
        icon: "mdi:check-circle-outline",
        kind: "number",
        value: (r) => r.cleared,
        width: "8rem",
        align: "right",
        render: (r) =>
          r.listed > 0 ? (
            <span className="tabular-nums">
              {r.cleared}
              <span className="text-[var(--mm-text-dim)]">/{r.listed}</span>
            </span>
          ) : (
            <span className="tabular-nums">{r.cleared}</span>
          ),
      },
      {
        key: "points",
        header: "Points",
        icon: "mdi:star-outline",
        kind: "number",
        value: (r) => r.points,
        width: "7rem",
        align: "right",
        render: (r) => (
          <span className="tabular-nums font-medium" style={{ color: accent }}>
            {r.points}
          </span>
        ),
      },
      {
        key: "lastAt",
        header: "Last action",
        icon: "mdi:clock-outline",
        kind: "datetime",
        value: (r) => r.lastAt,
        width: "12rem",
        render: (r) => formatDateTime(r.lastAt),
      },
      {
        key: "day",
        header: "Day",
        icon: "mdi:calendar",
        value: (r) => dayKey(r.lastAt),
        width: "9rem",
        hiddenByDefault: true,
        render: (r) => formatDate(r.lastAt),
      },
    ],
    [accent]
  );

  const runDelete = (ids: string[], clear: () => void) => {
    if (
      !window.confirm(
        `Remove progress for ${ids.length} adventurer${
          ids.length === 1 ? "" : "s"
        }? Their check-ins on this quest are deleted.`
      )
    ) {
      return;
    }
    setBulkError(null);
    startBulk(async () => {
      const res = await deleteQuestParticipants(questSlug, ids);
      if (res.ok) clear();
      else setBulkError(res.error);
    });
  };

  const toolbar = (
    <button
      type="button"
      aria-pressed={groupByDay}
      onClick={() => setGroupByDay((v) => !v)}
      className={`mm-btn text-xs ${
        groupByDay ? "mm-btn-primary" : "mm-btn-ghost"
      }`}
    >
      <Icon icon="mdi:calendar-month-outline" width={14} />
      Group by day
    </button>
  );

  const bulk = (ids: string[], clear: () => void) => (
    <button
      type="button"
      disabled={bulkPending}
      onClick={() => runDelete(ids, clear)}
      className="mm-btn mm-btn-ghost text-xs text-[var(--mm-danger)] disabled:opacity-50"
    >
      <Icon icon="mdi:trash-can-outline" width={14} />
      {bulkPending ? "Removing…" : "Remove progress"}
    </button>
  );

  if (rows.length === 0) {
    return (
      <div className="mm-glass flex flex-col items-center px-6 py-16 text-center">
        <Icon
          icon="mdi:account-group-outline"
          width={40}
          className="text-[var(--mm-text-dim)]"
        />
        <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl">
          No completions yet
        </h3>
        <p className="mt-2 max-w-md text-sm text-[var(--mm-text-dim)]">
          As adventurers check in, they land here — ready to export, clean up,
          or pick a winner for the day.
        </p>
      </div>
    );
  }

  if (!groupByDay) {
    return (
      <div className="space-y-3">
        {bulkError && <Flash tone="error">{bulkError}</Flash>}
        <DataTable
          rows={rows}
          columns={columns}
          rowId={(r) => r.id}
          storageKey={`quest-completions-${questSlug}`}
          accent={accent}
          initialSort={{ key: "points", dir: "desc" }}
          caption="Quest completions"
          searchPlaceholder="Search adventurers…"
          emptyMessage="No completions yet."
          toolbar={toolbar}
          bulkActions={bulk}
        />
      </div>
    );
  }

  const groups = groupRowsByDay(rows);

  return (
    <div className="space-y-6">
      {bulkError && <Flash tone="error">{bulkError}</Flash>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--mm-text-dim)]">
          Grouped by the calendar day of each adventurer&apos;s last check-in —
          use points within a day to pick that day&apos;s winners.
        </p>
        {toolbar}
      </div>
      {groups.map((g) => (
        <section key={g.key} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {g.label}
            </h3>
            <p className="text-sm text-[var(--mm-text-dim)]">
              {g.rows.length} adventurer{g.rows.length === 1 ? "" : "s"}
              {" · "}
              {g.rows.reduce((n, r) => n + r.points, 0)} pts
            </p>
          </div>
          <DataTable
            rows={g.rows}
            columns={columns}
            rowId={(r) => r.id}
            storageKey={`quest-completions-${questSlug}-${g.key}`}
            accent={accent}
            initialSort={{ key: "points", dir: "desc" }}
            caption={`Completions on ${g.label}`}
            searchPlaceholder="Search adventurers…"
            emptyMessage="Nobody active this day."
            bulkActions={bulk}
            pageSize={50}
          />
        </section>
      ))}
    </div>
  );
}

/** Local calendar day key — winners are a floor concern, not UTC. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupRowsByDay(
  rows: CompletionRow[]
): { key: string; label: string; rows: CompletionRow[] }[] {
  const byDay = new Map<string, CompletionRow[]>();
  for (const r of rows) {
    const key = dayKey(r.lastAt);
    const list = byDay.get(key);
    if (list) list.push(r);
    else byDay.set(key, [r]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, dayRows]) => ({
      key,
      label: formatDate(dayRows[0].lastAt),
      rows: dayRows,
    }));
}
