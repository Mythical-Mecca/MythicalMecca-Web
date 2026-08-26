"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Modal } from "@/components/modal";

/**
 * The admin data table.
 *
 * One component for every "list of records" screen in the admin portal:
 * sorting, search, per-column filters, column visibility, pagination, CSV
 * export, row selection with bulk actions, and — the point of it — inline
 * editing that writes through a Server Action.
 *
 * The editing contract is deliberately narrow: a cell hands the server an
 * `(id, column, value)` triple, always as a string, and gets back either
 * `{ ok: true }` or a message to show. That keeps the table ignorant of what
 * it is editing, so the same component can drive events, partners, quests or
 * members without learning any of their shapes. Validation and authorisation
 * belong on the server; anything checked here (`required`, `validate`) is a
 * courtesy to save a round trip, never the enforcement.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CellValue = string | number | boolean | null;

/** Drives both how a cell renders and which editor it opens. */
export type ColumnKind =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "datetime"
  | "date"
  | "boolean"
  | "url";

export interface SelectOption {
  value: string;
  label: string;
  /** Any CSS colour — tints the badge and the filter chip. */
  color?: string;
  icon?: string;
}

export interface DataTableColumn<T> {
  /** Unique, and the field name handed to `onSave`. */
  key: string;
  header: string;
  icon?: string;
  /** Default `"text"`. */
  kind?: ColumnKind;
  /** The raw value — used for sorting, filtering, export and the editor. */
  value: (row: T) => CellValue;
  /** Display override. Falls back to a renderer chosen by `kind`. */
  render?: (row: T, value: CellValue) => React.ReactNode;
  /**
   * A leading control rendered beside the cell — a view button, a status dot,
   * a drag handle. It sits OUTSIDE the cell's edit trigger, which is the whole
   * point: an editable cell is itself a `<button>`, and nesting an interactive
   * element inside one is invalid and unreachable by keyboard.
   */
  prefix?: (row: T) => React.ReactNode;
  /** Required for `kind: "select"`. */
  options?: SelectOption[];
  /** Cells become editable only when this is true AND `onSave` is provided. */
  editable?: boolean;
  /** Default true. */
  sortable?: boolean;
  /** Adds a dropdown to the filter bar. Needs `options`. */
  filterable?: boolean;
  /** Default true — include this column's text in the search index. */
  searchable?: boolean;
  /** Start hidden; the reader can reveal it from the Columns menu. */
  hiddenByDefault?: boolean;
  /** CSS width for the column, e.g. `"18rem"`. */
  width?: string;
  align?: "left" | "center" | "right";
  /** Render the value in the mono face — ids, slugs, codes. */
  mono?: boolean;
  placeholder?: string;
  /** Reject an empty value before it reaches the server. */
  required?: boolean;
  /** Return a message to block the save, or null to allow it. */
  validate?: (next: string, row: T) => string | null;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** A Server Action, or anything that resolves like one. */
export type SaveHandler = (
  id: string,
  key: string,
  value: string
) => Promise<SaveResult>;

export interface DataTableProps<T> {
  rows: T[];
  /** Memoise this in the parent — it feeds several `useMemo` chains. */
  columns: DataTableColumn<T>[];
  rowId: (row: T) => string;
  /** Omit to render a read-only table, whatever the columns say. */
  onSave?: SaveHandler;
  /** Trailing per-row controls (links, destructive buttons, menus). */
  rowActions?: (row: T) => React.ReactNode;
  /** Renders above the table whenever at least one row is selected. */
  bulkActions?: (ids: string[], clearSelection: () => void) => React.ReactNode;
  /**
   * The screen's create action. Rendered as an icon-only button on a phone and
   * icon + label from `sm` up, so the search field keeps its width on a narrow
   * screen. Prefer this over `toolbar` for "New …".
   */
  primaryAction?: {
    label: string;
    icon?: string;
    onClick: () => void;
    /** Sets aria-haspopup when the action opens a dialog. */
    opensDialog?: boolean;
  };
  /** Any other toolbar control. Sits after the primary action. */
  toolbar?: React.ReactNode;
  initialSort?: { key: string; dir: SortDir };
  /** Default 25. */
  pageSize?: number;
  /** Namespace for the remembered column layout. Omit to not remember. */
  storageKey?: string;
  accent?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  /** Screen-reader description of the table. */
  caption?: string;
}

export type SortDir = "asc" | "desc";

/** Which of the table's two renderings is on screen. */
export type TableView = "table" | "list";

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

// A separator that cannot occur inside an id or a column key.
const SEP = "\u0000";
const cellKey = (id: string, key: string) => `${id}${SEP}${key}`;

/**
 * The canonical string form of a value — what an editor starts from, what
 * gets compared against an optimistic override, and what ships to the server.
 * Booleans travel as "1"/"" so a `FormData`-shaped action reads them naturally.
 */
function toEditString(v: CellValue, kind: ColumnKind): string {
  if (v === null || v === undefined) return "";
  if (kind === "boolean") return v ? "1" : "";
  return String(v);
}

/** The inverse — an edited string back into the shape the column deals in. */
function fromEditString(s: string, kind: ColumnKind): CellValue {
  if (kind === "boolean") return s === "1";
  if (kind === "number") return s === "" ? null : Number(s);
  return s === "" ? null : s;
}

/**
 * Anything read from the browser that the server can't know about — the clock's
 * timezone, `localStorage` — is read through this rather than an effect, so the
 * first client render still matches the server's and hydration stays quiet.
 */
const noopSubscribe = () => () => {};

/** Live `matches` for a media query, read the hydration-safe way. */
const WIDE_QUERY = "(min-width: 768px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO instant → the local wall-clock string an `<input type=datetime-local>` wants. */
function isoToLocalInput(iso: string, withTime: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

/**
 * …and back. The admin typed a wall-clock time in their own timezone, so the
 * conversion has to happen here, in their browser. Sending the naked
 * "2026-07-18T09:00" to the server would have it parsed against the server's
 * timezone instead — an hour or two of silent drift on every edit.
 */
function localInputToIso(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * Dates render as a stable UTC string until mount, then upgrade to the
 * reader's locale. The server and the admin's browser don't share a timezone,
 * and formatting during render on both sides is a hydration mismatch.
 */
function formatStamp(iso: string, kind: ColumnKind, local: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (!local) {
    const s = d.toISOString();
    return kind === "date" ? s.slice(0, 10) : `${s.slice(0, 10)} ${s.slice(11, 16)}`;
  }
  return kind === "date"
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function compareValues(a: CellValue, b: CellValue, kind: ColumnKind): number {
  if (kind === "datetime" || kind === "date") {
    return new Date(String(a)).getTime() - new Date(String(b)).getTime();
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Number(Boolean(a)) - Number(Boolean(b));
  }
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/** Copy of `obj` without `key` — the same shape React state updaters want. */
function without<V>(obj: Record<string, V>, key: string): Record<string, V> {
  if (!(key in obj)) return obj;
  const next = { ...obj };
  delete next[key];
  return next;
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const controlCls =
  "rounded-lg border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] px-3 py-1.5 text-xs text-[var(--mm-text)] transition placeholder:text-[var(--mm-text-dim)] focus:border-[var(--mm-violet)]";

/**
 * Table / list switch.
 *
 * Two segments in one trough rather than two loose buttons, for the same
 * reason `SectionTabs` is: a shared surface with one segment lit reads as
 * "these are the two states of one thing, and you are here". Both are always
 * available at every width — the breakpoint only decides where you start.
 */
function ViewSwitch({
  view,
  onChange,
  accent,
}: {
  view: TableView;
  onChange: (v: TableView) => void;
  accent: string;
}) {
  const options: { value: TableView; icon: string; label: string }[] = [
    { value: "list", icon: "mdi:view-agenda-outline", label: "List view" },
    { value: "table", icon: "mdi:table", label: "Table view" },
  ];
  return (
    <div
      role="group"
      aria-label="Layout"
      className="inline-flex shrink-0 gap-1 rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] p-1"
    >
      {options.map((o) => {
        const on = view === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            title={o.label}
            className={`grid h-8 w-9 place-items-center rounded-lg transition ${
              on
                ? ""
                : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            }`}
            style={
              on
                ? {
                    background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                    color: `color-mix(in srgb, ${accent} 75%, white)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 45%, transparent)`,
                  }
                : undefined
            }
          >
            <Icon icon={o.icon} width={16} />
            <span className="sr-only">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SortIcon({ state }: { state: SortDir | null }) {
  if (!state) {
    return (
      <Icon
        icon="mdi:unfold-more-horizontal"
        width={13}
        className="opacity-0 transition group-hover:opacity-45"
      />
    );
  }
  return (
    <Icon
      icon={state === "asc" ? "mdi:arrow-up" : "mdi:arrow-down"}
      width={13}
      className="text-[var(--mm-gold)]"
    />
  );
}

// ---------------------------------------------------------------------------
// Cell
// ---------------------------------------------------------------------------

interface CellProps<T> {
  row: T;
  col: DataTableColumn<T>;
  value: CellValue;
  editing: boolean;
  saving: boolean;
  error: string | null;
  localTime: boolean;
  onBeginEdit: () => void;
  onCommit: (next: string) => void;
  onCancel: () => void;
  /** Commit, then hop to the next editable cell in this row. */
  onCommitAndAdvance: (next: string) => void;
}

function Cell<T>({
  row,
  col,
  value,
  editing,
  saving,
  error,
  localTime,
  onBeginEdit,
  onCommit,
  onCancel,
  onCommitAndAdvance,
}: CellProps<T>) {
  const kind = col.kind ?? "text";
  const editable = col.editable === true;
  const raw = toEditString(value, kind);

  // ---- editors -------------------------------------------------------------
  if (editing) {
    if (kind === "select") {
      return (
        <select
          autoFocus
          defaultValue={raw}
          onChange={(e) => onCommit(e.currentTarget.value)}
          onBlur={onCancel}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          className={`${controlCls} w-full`}
        >
          {!col.required && <option value="">—</option>}
          {col.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    if (kind === "textarea") {
      return (
        <textarea
          autoFocus
          rows={4}
          defaultValue={raw}
          placeholder={col.placeholder}
          onBlur={(e) => onCommit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
            // Enter inserts a newline here, so committing needs the modifier.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onCommit(e.currentTarget.value);
            }
          }}
          className={`${controlCls} w-full min-w-[22rem] resize-y`}
        />
      );
    }

    const isStamp = kind === "datetime" || kind === "date";
    const inputType =
      kind === "number"
        ? "number"
        : kind === "datetime"
          ? "datetime-local"
          : kind === "date"
            ? "date"
            : kind === "url"
              ? "url"
              : "text";

    return (
      <input
        autoFocus
        type={inputType}
        defaultValue={isStamp && raw ? isoToLocalInput(raw, kind === "datetime") : raw}
        placeholder={col.placeholder}
        onBlur={(e) =>
          onCommit(isStamp ? localInputToIso(e.currentTarget.value) : e.currentTarget.value)
        }
        onKeyDown={(e) => {
          const read = () =>
            isStamp ? localInputToIso(e.currentTarget.value) : e.currentTarget.value;
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(read());
          }
          if (e.key === "Tab") {
            e.preventDefault();
            onCommitAndAdvance(read());
          }
        }}
        className={`${controlCls} w-full min-w-[9rem]`}
      />
    );
  }

  // ---- display -------------------------------------------------------------
  let body: React.ReactNode;

  if (col.render) {
    body = col.render(row, value);
  } else if (kind === "boolean") {
    body = value ? (
      <Icon icon="mdi:check-circle" width={16} className="text-[var(--mm-live)]" />
    ) : (
      <Icon icon="mdi:circle-outline" width={16} className="text-[var(--mm-text-dim)]" />
    );
  } else if (raw === "") {
    body = <span className="text-[var(--mm-text-dim)]">—</span>;
  } else if (kind === "select") {
    const opt = col.options?.find((o) => o.value === raw);
    body = (
      <Badge color={opt?.color} icon={opt?.icon}>
        {opt?.label ?? raw}
      </Badge>
    );
  } else if (kind === "datetime" || kind === "date") {
    body = (
      <span className="whitespace-nowrap tabular-nums">
        {formatStamp(raw, kind, localTime)}
      </span>
    );
  } else if (kind === "url") {
    body = (
      <a
        href={raw}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-[var(--mm-blue)] hover:underline"
      >
        <span className="max-w-[16rem] truncate">{raw.replace(/^https?:\/\//, "")}</span>
        <Icon icon="mdi:open-in-new" width={12} className="shrink-0" />
      </a>
    );
  } else {
    body = (
      <span
        className={`block max-w-[26rem] truncate ${col.mono ? "font-mono text-xs" : ""}`}
        title={raw.length > 40 ? raw : undefined}
      >
        {raw}
      </span>
    );
  }

  if (!editable) {
    return <div className="px-3 py-2">{body}</div>;
  }

  // Booleans skip the editor entirely — the click IS the edit.
  if (kind === "boolean") {
    return (
      <button
        type="button"
        disabled={saving}
        onClick={() => onCommit(value ? "" : "1")}
        title={error ?? "Toggle"}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition hover:bg-[color-mix(in_srgb,var(--mm-violet)_12%,transparent)] disabled:opacity-50"
      >
        {saving ? <Icon icon="mdi:loading" width={15} className="mm-gear" /> : body}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onBeginEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          onBeginEdit();
        }
      }}
      title={error ?? "Click to edit"}
      className={`group/cell flex w-full items-center gap-1.5 px-3 py-2 text-left transition hover:bg-[color-mix(in_srgb,var(--mm-violet)_12%,transparent)] ${
        error ? "ring-1 ring-inset ring-[var(--mm-danger)]" : ""
      }`}
    >
      <span className="min-w-0 flex-1">
        {body}
        {/* The reverted value on its own reads as "nothing happened". The
            reason has to be on screen, not only in the tooltip. */}
        {error && (
          <span className="mt-0.5 block text-[11px] leading-tight text-[var(--mm-danger)]">
            {error}
          </span>
        )}
      </span>
      {saving ? (
        <Icon icon="mdi:loading" width={13} className="mm-gear shrink-0 text-[var(--mm-gold)]" />
      ) : error ? (
        <Icon icon="mdi:alert-circle" width={13} className="shrink-0 text-[var(--mm-danger)]" />
      ) : (
        <Icon
          icon="mdi:pencil-outline"
          width={12}
          className="shrink-0 opacity-0 transition group-hover/cell:opacity-50"
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T>({
  rows,
  columns,
  rowId,
  onSave,
  rowActions,
  bulkActions,
  primaryAction,
  toolbar,
  initialSort,
  pageSize = 25,
  storageKey,
  accent = "var(--mm-gold)",
  emptyMessage = "Nothing here yet.",
  searchPlaceholder = "Search…",
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    initialSort ?? null
  );
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);
  const [saving, setSaving] = useState<Record<string, true>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  /**
   * Optimistic values. Each records the value it replaced, which is what makes
   * it self-retiring: once the revalidated rows arrive carrying something else,
   * `from` no longer matches and the override is simply ignored. Without one,
   * the cell snaps back to the old value for the length of the round trip and
   * the edit reads as rejected.
   */
  const [overrides, setOverrides] = useState<
    Record<string, { from: string; to: string }>
  >({});

  // Locale formatting only starts after hydration — see `formatStamp`.
  const localTime = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  // ---- remembered column layout -------------------------------------------
  const savedLayout = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (!storageKey) return null;
      try {
        return window.localStorage.getItem(`mm-table:${storageKey}`);
      } catch {
        return null;
      }
    },
    () => null
  );

  const remembered = useMemo(() => {
    if (!savedLayout) return null;
    try {
      return JSON.parse(savedLayout) as {
        visible?: Record<string, boolean>;
        perPage?: number;
        view?: TableView;
      };
    } catch {
      // A corrupt entry is not worth breaking the page over.
      return null;
    }
  }, [savedLayout]);

  // The reader's choices win over what was remembered, which wins over the
  // column defaults.
  const [visibleChoice, setVisibleChoice] = useState<Record<string, boolean> | null>(
    null
  );
  const [perPageChoice, setPerPageChoice] = useState<number | null>(null);

  /**
   * Table or list.
   *
   * The grid suits a wide screen and the list suits a narrow one, so that is
   * the default — but it is only a default. Plenty of records read better as
   * cards even on a desktop (long titles, few columns), and an admin on a
   * tablet may genuinely want the grid. Once someone picks, the choice sticks
   * with the rest of their remembered layout.
   */
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewChoice, setViewChoice] = useState<TableView | null>(null);
  const isWide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true
  );
  const view: TableView =
    viewChoice ?? remembered?.view ?? (isWide ? "table" : "list");

  const visible = useMemo(
    () => ({
      ...Object.fromEntries(columns.map((c) => [c.key, !c.hiddenByDefault])),
      ...(remembered?.visible ?? {}),
      ...(visibleChoice ?? {}),
    }),
    [columns, remembered, visibleChoice]
  );
  const perPage = perPageChoice ?? remembered?.perPage ?? pageSize;

  const persist = (next: {
    visible?: Record<string, boolean>;
    perPage?: number;
    view?: TableView;
  }) => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(
        `mm-table:${storageKey}`,
        JSON.stringify({ visible, perPage, view, ...next })
      );
    } catch {
      // Private mode / quota — the layout just won't be remembered.
    }
  };

  const shownColumns = useMemo(
    () => columns.filter((c) => visible[c.key] !== false),
    [columns, visible]
  );

  const editableColumns = useMemo(
    () => (onSave ? shownColumns.filter((c) => c.editable) : []),
    [shownColumns, onSave]
  );

  const valueOf = (row: T, col: DataTableColumn<T>): CellValue => {
    const base = col.value(row);
    const o = overrides[cellKey(rowId(row), col.key)];
    if (!o) return base;
    const kind = col.kind ?? "text";
    // The server has since moved — trust it, not the stale optimistic value.
    if (toEditString(base, kind) !== o.from) return base;
    return fromEditString(o.to, kind);
  };

  // ---- search / filter / sort ----------------------------------------------
  const searchText = (row: T): string =>
    columns
      .filter((c) => c.searchable !== false)
      .map((c) => {
        const v = valueOf(row, c);
        const raw = toEditString(v, c.kind ?? "text");
        if (c.kind === "select") {
          return c.options?.find((o) => o.value === raw)?.label ?? raw;
        }
        return raw;
      })
      .join(" ")
      .toLowerCase();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = Object.entries(filters).filter(([, v]) => v !== "");
    return rows.filter((row) => {
      for (const [key, want] of active) {
        const col = columns.find((c) => c.key === key);
        if (!col) continue;
        if (toEditString(valueOf(row, col), col.kind ?? "text") !== want) return false;
      }
      return q === "" || searchText(row).includes(q);
    });
    // `overrides` participates through valueOf, so an edited row filters
    // correctly the moment it is saved rather than a round trip later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, query, filters, overrides]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const kind = col.kind ?? "text";
    return [...filtered].sort((ra, rb) => {
      const a = valueOf(ra, col);
      const b = valueOf(rb, col);
      const aBlank = a === null || a === "";
      const bBlank = b === null || b === "";
      // Blanks sink to the bottom either way — an admin sorting by date wants
      // the dated rows, not a screen of empties.
      if (aBlank && bBlank) return 0;
      if (aBlank) return 1;
      if (bBlank) return -1;
      const c = compareValues(a, b, kind);
      return sort.dir === "asc" ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columns, overrides]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  // Narrowing the result set can strand the reader on a page that no longer
  // exists; clamping beats resetting, because it also survives a row being
  // deleted out from under them.
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * perPage, safePage * perPage + perPage);

  // ---- editing -------------------------------------------------------------
  const commit = async (row: T, col: DataTableColumn<T>, next: string) => {
    const id = rowId(row);
    const k = cellKey(id, col.key);
    setEditing(null);

    const current = toEditString(col.value(row), col.kind ?? "text");
    if (next === current) {
      // Nothing to save — but if an earlier edit is still in flight, its
      // optimistic value has to go, or the cell keeps showing a value the
      // reader has just typed away from.
      setOverrides((o) => without(o, k));
      setErrors((e) => without(e, k));
      return;
    }
    if (col.required && next.trim() === "") {
      setErrors((e) => ({ ...e, [k]: `${col.header} can't be empty.` }));
      return;
    }
    const local = col.validate?.(next, row) ?? null;
    if (local) {
      setErrors((e) => ({ ...e, [k]: local }));
      return;
    }
    if (!onSave) return;

    setErrors((e) => without(e, k));
    setOverrides((o) => ({ ...o, [k]: { from: current, to: next } }));
    setSaving((s) => ({ ...s, [k]: true }));

    let result: SaveResult;
    try {
      result = await onSave(id, col.key, next);
    } catch {
      result = { ok: false, error: "Couldn't reach the server. Try again." };
    }

    setSaving((s) => without(s, k));
    if (!result.ok) {
      const { error } = result;
      // Drop the optimistic value so the cell shows what the server actually has.
      setOverrides((o) => without(o, k));
      setErrors((e) => ({ ...e, [k]: error }));
    }
  };

  const advance = (row: T, col: DataTableColumn<T>) => {
    const i = editableColumns.findIndex((c) => c.key === col.key);
    const next = editableColumns[i + 1];
    if (next) setEditing({ id: rowId(row), key: next.key });
  };

  // ---- selection -----------------------------------------------------------
  const pageIds = pageRows.map(rowId);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // ---- export --------------------------------------------------------------
  const exportCsv = () => {
    const header = shownColumns.map((c) => csvEscape(c.header)).join(",");
    const body = sorted
      .map((row) =>
        shownColumns
          .map((c) => csvEscape(toEditString(valueOf(row, c), c.kind ?? "text")))
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storageKey ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterColumns = columns.filter((c) => c.filterable && c.options);
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;
  const hiddenCount = columns.length - shownColumns.length;
  /**
   * What the badge counts: things *you* changed, not the column defaults.
   *
   * Counting hidden columns outright made every table open showing "2
   * applied", because `hiddenByDefault` columns like Slug and ID are meant to
   * be hidden — a badge that is never zero teaches you to ignore it.
   */
  const changedColumns = columns.filter(
    (c) => (visible[c.key] !== false) === !!c.hiddenByDefault
  ).length;
  const adjustments = activeFilterCount + changedColumns;
  const selectedIds = [...selected];

  return (
    <div className="space-y-3">
      {/* ---------------- row 1: which layout ---------------- */}
      <ViewSwitch
        view={view}
        onChange={(v) => {
          setViewChoice(v);
          persist({ view: v });
        }}
        accent={accent}
      />

      {/* ---------------- row 2: find, refine, create ----------------
          Search is the only control that earns permanent space — it is the one
          you reach for on every visit. Filters, column visibility, page size
          and export all moved behind the single Options button: on a phone the
          old row wrapped into four stacked lines of half-width selects before
          the table even started. */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            icon="mdi:magnify"
            width={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mm-text-dim)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            aria-label="Search table"
            className={`${controlCls} h-11 w-full pl-9 text-sm`}
          />
        </div>

        <button
          type="button"
          onClick={() => setOptionsOpen(true)}
          aria-haspopup="dialog"
          aria-label={
            adjustments > 0
              ? `Table options — ${adjustments} applied`
              : "Table options"
          }
          className={`${controlCls} relative grid h-11 w-11 shrink-0 place-items-center hover:border-[var(--mm-gold)]`}
        >
          <Icon icon="mdi:tune-variant" width={18} />
          {/* Filters and hidden columns change what you are looking at, so the
              count has to survive the panel being shut. */}
          {adjustments > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
              style={{ background: accent, color: "#10141f" }}
            >
              {adjustments}
            </span>
          )}
        </button>

        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            aria-haspopup={primaryAction.opensDialog ? "dialog" : undefined}
            aria-label={primaryAction.label}
            className="mm-btn mm-btn-primary h-11 shrink-0 px-0 text-sm max-sm:w-11 sm:px-4"
          >
            <Icon icon={primaryAction.icon ?? "mdi:plus"} width={18} />
            {/* Icon alone on a phone — the label would push search down to
                nothing on a 375px screen. */}
            <span className="max-sm:hidden">{primaryAction.label}</span>
          </button>
        )}

        {toolbar}
      </div>

      {/* ---------------- bulk bar ---------------- */}
      {bulkActions && selectedIds.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 text-sm"
          style={{
            borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
          }}
        >
          <span className="font-medium">
            {selectedIds.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions(selectedIds, () => setSelected(new Set()))}
          </div>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ---------------- table ---------------- */}
      <div className="mm-glass overflow-hidden">
        {/* The grid, for screens with room for it. On a 375px phone this table
            was 2192px wide inside a two-axis scroller — every row needed six
            swipes to read and the header scrolled out of sight on the way. The
            card list below carries the same rows and the same editors. */}
        <div
          className={`mm-scroll max-h-[70vh] overflow-auto ${
            view === "table" ? "block" : "hidden"
          }`}
        >
          <table className="w-full border-collapse text-sm">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="sticky top-0 z-20">
              <tr className="bg-[var(--mm-elevated)]">
                {bulkActions && (
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <label className="grid h-6 w-6 cursor-pointer place-items-center">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        aria-label="Select all rows on this page"
                        className="h-4 w-4 accent-[var(--mm-gold)]"
                      />
                    </label>
                  </th>
                )}
                {shownColumns.map((c) => {
                  const state = sort?.key === c.key ? sort.dir : null;
                  const sortable = c.sortable !== false;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      style={c.width ? { width: c.width } : undefined}
                      aria-sort={
                        state ? (state === "asc" ? "ascending" : "descending") : "none"
                      }
                      className={`whitespace-nowrap border-b border-[var(--mm-border)] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-[var(--mm-text-dim)] ${
                        c.align === "right"
                          ? "text-right"
                          : c.align === "center"
                            ? "text-center"
                            : ""
                      }`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSort((s) =>
                              s?.key === c.key
                                ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                : { key: c.key, dir: "asc" }
                            )
                          }
                          className="group inline-flex min-h-6 items-center gap-1.5 transition hover:text-[var(--mm-text)]"
                        >
                          {c.icon && <Icon icon={c.icon} width={13} />}
                          {c.header}
                          <SortIcon state={state} />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          {c.icon && <Icon icon={c.icon} width={13} />}
                          {c.header}
                        </span>
                      )}
                    </th>
                  );
                })}
                {rowActions && (
                  <th
                    scope="col"
                    className="border-b border-[var(--mm-border)] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-[var(--mm-text-dim)]"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      shownColumns.length + (bulkActions ? 1 : 0) + (rowActions ? 1 : 0)
                    }
                    className="px-4 py-12 text-center text-sm text-[var(--mm-text-dim)]"
                  >
                    <Icon
                      icon="mdi:table-search"
                      width={28}
                      className="mx-auto mb-2 opacity-40"
                    />
                    {rows.length === 0 ? emptyMessage : "No rows match those filters."}
                  </td>
                </tr>
              )}

              {pageRows.map((row) => {
                const id = rowId(row);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`border-b border-[color-mix(in_srgb,var(--mm-divider)_75%,transparent)] transition last:border-0 ${
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)]"
                        : "hover:bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)]"
                    }`}
                  >
                    {bulkActions && (
                      <td className="px-3 py-2">
                        <label className="grid h-6 w-6 cursor-pointer place-items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(id)}
                            aria-label="Select row"
                            className="h-4 w-4 accent-[var(--mm-gold)]"
                          />
                        </label>
                      </td>
                    )}

                    {shownColumns.map((c) => {
                      const k = cellKey(id, c.key);
                      const cell = (
                        <Cell
                          row={row}
                          col={{ ...c, editable: !!onSave && c.editable }}
                          value={valueOf(row, c)}
                          editing={editing?.id === id && editing.key === c.key}
                          saving={!!saving[k]}
                          error={errors[k] ?? null}
                          localTime={localTime}
                          onBeginEdit={() => setEditing({ id, key: c.key })}
                          onCommit={(next) => void commit(row, c, next)}
                          onCancel={() => setEditing(null)}
                          onCommitAndAdvance={(next) => {
                            void commit(row, c, next);
                            advance(row, c);
                          }}
                        />
                      );
                      return (
                        <td
                          key={c.key}
                          className={`align-middle ${
                            c.align === "right"
                              ? "text-right"
                              : c.align === "center"
                                ? "text-center"
                                : ""
                          }`}
                        >
                          {c.prefix ? (
                            <div className="flex items-center">
                              <span className="shrink-0 pl-3">{c.prefix(row)}</span>
                              <span className="min-w-0 flex-1">{cell}</span>
                            </div>
                          ) : (
                            cell
                          )}
                        </td>
                      );
                    })}

                    {rowActions && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {rowActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ---------------- cards (below md) ---------------- */}
        <ul
          className={`divide-y divide-[var(--mm-divider)] ${
            view === "list" ? "block" : "hidden"
          }`}
        >
          {pageRows.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-[var(--mm-text-dim)]">
              <Icon
                icon="mdi:table-search"
                width={28}
                className="mx-auto mb-2 opacity-40"
              />
              {rows.length === 0 ? emptyMessage : "No rows match those filters."}
            </li>
          )}

          {pageRows.map((row) => {
            const id = rowId(row);
            const isSelected = selected.has(id);
            // The first visible column is the record's name on every screen
            // this table drives, so it becomes the card's title and the rest
            // become labelled rows underneath.
            const [titleCol, ...restCols] = shownColumns;
            return (
              <li
                key={id}
                className={
                  isSelected
                    ? "bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)]"
                    : ""
                }
              >
                <div className="flex items-start gap-2 px-3 py-3">
                  {bulkActions && (
                    <label className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label="Select row"
                        className="h-4 w-4 accent-[var(--mm-gold)]"
                      />
                    </label>
                  )}

                  <div className="min-w-0 flex-1">
                    {titleCol && (
                      <div className="flex items-center gap-1.5 font-medium">
                        {titleCol.prefix && (
                          <span className="shrink-0">{titleCol.prefix(row)}</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <Cell
                            row={row}
                            col={{ ...titleCol, editable: !!onSave && titleCol.editable }}
                            value={valueOf(row, titleCol)}
                            editing={editing?.id === id && editing.key === titleCol.key}
                            saving={!!saving[cellKey(id, titleCol.key)]}
                            error={errors[cellKey(id, titleCol.key)] ?? null}
                            localTime={localTime}
                            onBeginEdit={() => setEditing({ id, key: titleCol.key })}
                            onCommit={(next) => void commit(row, titleCol, next)}
                            onCancel={() => setEditing(null)}
                            onCommitAndAdvance={(next) => {
                              void commit(row, titleCol, next);
                              advance(row, titleCol);
                            }}
                          />
                        </span>
                      </div>
                    )}

                    <dl className="mt-1.5 space-y-0.5">
                      {restCols.map((c) => {
                        const k = cellKey(id, c.key);
                        return (
                          <div
                            key={c.key}
                            className="flex items-baseline gap-2 text-sm"
                          >
                            <dt className="w-24 shrink-0 text-[11px] uppercase tracking-widest text-[var(--mm-text-dim)]">
                              {c.header}
                            </dt>
                            <dd className="min-w-0 flex-1">
                              <Cell
                                row={row}
                                col={{ ...c, editable: !!onSave && c.editable }}
                                value={valueOf(row, c)}
                                editing={editing?.id === id && editing.key === c.key}
                                saving={!!saving[k]}
                                error={errors[k] ?? null}
                                localTime={localTime}
                                onBeginEdit={() => setEditing({ id, key: c.key })}
                                onCommit={(next) => void commit(row, c, next)}
                                onCancel={() => setEditing(null)}
                                onCommitAndAdvance={(next) => {
                                  void commit(row, c, next);
                                  advance(row, c);
                                }}
                              />
                            </dd>
                          </div>
                        );
                      })}
                    </dl>

                    {rowActions && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {rowActions(row)}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* ---------------- pager ---------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mm-border)] px-4 py-2.5 text-xs text-[var(--mm-text-dim)]">
          <span>
            {sorted.length === 0
              ? "No rows"
              : `${safePage * perPage + 1}–${Math.min(
                  (safePage + 1) * perPage,
                  sorted.length
                )} of ${sorted.length}`}
            {sorted.length !== rows.length && ` (filtered from ${rows.length})`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className={`${controlCls} grid h-9 w-9 place-items-center disabled:opacity-35`}
              aria-label="Previous page"
            >
              <Icon icon="mdi:chevron-left" width={15} />
            </button>
            <span className="tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className={`${controlCls} grid h-9 w-9 place-items-center disabled:opacity-35`}
              aria-label="Next page"
            >
              <Icon icon="mdi:chevron-right" width={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- options ---------------- */}
      <Modal
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="Table options"
        description="Narrow what you are looking at, choose the columns, or take the data with you."
        icon="mdi:tune-variant"
        accent={accent}
      >
        <div className="space-y-7">
          {filterColumns.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
                  <Icon icon="mdi:filter-outline" width={14} />
                  Filters
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({});
                      setPage(0);
                    }}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
                  >
                    <Icon icon="mdi:filter-remove-outline" width={14} />
                    Clear {activeFilterCount}
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {filterColumns.map((c) => (
                  <label key={c.key} className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                      {c.icon && (
                        <Icon
                          icon={c.icon}
                          width={14}
                          className="text-[var(--mm-text-dim)]"
                        />
                      )}
                      {c.header}
                    </span>
                    <select
                      value={filters[c.key] ?? ""}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        setFilters((f) => ({ ...f, [c.key]: v }));
                        setPage(0);
                      }}
                      className={`${controlCls} h-11 w-full text-sm`}
                    >
                      <option value="">All {c.header.toLowerCase()}</option>
                      {c.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
                <Icon icon="mdi:view-column-outline" width={14} />
                Columns
              </h3>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = Object.fromEntries(
                      columns.map((c) => [c.key, true])
                    );
                    setVisibleChoice(next);
                    persist({ visible: next });
                  }}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
                >
                  <Icon icon="mdi:eye-outline" width={14} />
                  Show all {hiddenCount}
                </button>
              )}
            </div>
            {/* Full-width rows rather than the old 8px-tall popover lines --
                these are comfortably tappable, and the checkbox and its label
                are one target. */}
            <div className="grid gap-1 sm:grid-cols-2">
              {columns.map((c) => {
                const on = visible[c.key] !== false;
                return (
                  <label
                    key={c.key}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 text-sm transition hover:border-[var(--mm-border)] hover:bg-[color-mix(in_srgb,var(--mm-elevated)_50%,transparent)]"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const next = {
                          ...visible,
                          [c.key]: e.currentTarget.checked,
                        };
                        setVisibleChoice(next);
                        persist({ visible: next });
                      }}
                      className="h-4 w-4 shrink-0 accent-[var(--mm-gold)]"
                    />
                    {c.icon && (
                      <Icon
                        icon={c.icon}
                        width={15}
                        className={on ? "opacity-80" : "opacity-40"}
                      />
                    )}
                    <span className={on ? "" : "text-[var(--mm-text-dim)]"}>
                      {c.header}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
                <Icon icon="mdi:format-list-numbered" width={14} />
                Rows per page
              </span>
              <select
                value={perPage}
                onChange={(e) => {
                  const n = Number(e.currentTarget.value);
                  setPerPageChoice(n);
                  setPage(0);
                  persist({ perPage: n });
                }}
                className={`${controlCls} h-11 w-full text-sm`}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
                <Icon icon="mdi:download-outline" width={14} />
                Export
              </span>
              <button
                type="button"
                onClick={exportCsv}
                className="mm-btn mm-btn-ghost h-11 w-full text-sm"
              >
                <Icon icon="mdi:file-delimited-outline" width={16} />
                Download {sorted.length} row{sorted.length === 1 ? "" : "s"}
              </button>
            </div>
          </section>

          <div className="flex justify-end border-t border-[var(--mm-divider)] pt-4">
            <button
              type="button"
              onClick={() => setOptionsOpen(false)}
              className="mm-btn mm-btn-primary text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {onSave && editableColumns.length > 0 && (
        <p className="text-xs text-[var(--mm-text-dim)]">
          <Icon icon="mdi:cursor-default-click-outline" width={13} className="mr-1 inline" />
          Click any highlighted cell to edit. <kbd>Enter</kbd> saves,{" "}
          <kbd>Esc</kbd> cancels, <kbd>Tab</kbd> saves and moves to the next field.
        </p>
      )}
    </div>
  );
}
