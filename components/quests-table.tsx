"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";
import { OpenLinkDialog, type LinkChoice } from "@/components/open-link-dialog";
import { QuestCreateForm, type QuestEventOption } from "@/components/quest-create-form";
import { setQuestsActive, updateQuestField } from "@/app/(admin)/actions";
import { ACCENT } from "@/lib/accents";
import { withReturn, type ReturnTo } from "@/lib/return-to";
import type { AdminQuestRow } from "@/lib/admin-quests";

/**
 * "0" rather than "" for off. The filter bar uses an empty value to mean "no
 * filter", so an option that is itself empty can never be selected — picking
 * "Off" silently cleared the filter instead of showing the offline quests.
 * `updateQuestField` reads active as `v === "1"`, so "0" lands as false.
 */
const LIVE_OPTIONS = [
  { value: "1", label: "Live", color: "var(--mm-live)", icon: "mdi:broadcast" },
  { value: "0", label: "Off", color: "var(--mm-text-dim)", icon: "mdi:pause" },
];

/**
 * Everywhere a single quest can be opened from. Same shape as the events
 * table's, so "click the title" means the same thing on both screens.
 */
function destinations(r: AdminQuestRow, back: ReturnTo): LinkChoice[] {
  return [
    {
      label: "Manage Quest",
      href: withReturn(`/admin/quests/${r.slug}`, back),
      icon: "mdi:cog-outline",
      hint: "The trail, settings and check-in activity",
    },
    {
      label: "Print Tags",
      href: withReturn(`/admin/quests/${r.slug}/tags`, back),
      icon: "mdi:qrcode",
      hint: "QR codes for every objective",
    },
    {
      label: "View Public Quest Page",
      href: `/quests/${r.slug}`,
      icon: "game-icons:treasure-map",
      hint: r.active ? "What adventurers see" : "Offline — not listed publicly",
    },
    ...(r.eventSlug
      ? [
          {
            label: "View Attached Event",
            href: `/events/${r.eventSlug}`,
            icon: "game-icons:campfire",
            hint: r.eventTitle ?? undefined,
          },
        ]
      : []),
  ];
}

/** Where a quest opened from this screen should return to. */
const BACK_TO_LIST: ReturnTo = { href: "/admin/quests", label: "all quests" };

export function QuestsTable({
  quests,
  events,
}: {
  quests: AdminQuestRow[];
  events: QuestEventOption[];
}) {
  const [creating, setCreating] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, startBulk] = useTransition();

  const columns = useMemo<DataTableColumn<AdminQuestRow>[]>(
    () => [
      {
        key: "title",
        header: "Title",
        icon: "mdi:format-title",
        value: (r) => r.title,
        editable: true,
        required: true,
        width: "20rem",
        placeholder: "Quest name",
        prefix: (r) => (
          <OpenLinkDialog
            label={r.title}
            title="Open"
            items={destinations(r, BACK_TO_LIST)}
          />
        ),
      },
      {
        key: "active",
        header: "Live",
        icon: "mdi:broadcast",
        kind: "select",
        options: LIVE_OPTIONS,
        value: (r) => (r.active ? "1" : "0"),
        editable: true,
        filterable: true,
      },
      {
        key: "eventId",
        header: "Event",
        icon: "game-icons:campfire",
        kind: "select",
        options: events.map((e) => ({
          value: e.id,
          label: e.title,
          icon: "game-icons:campfire",
        })),
        // The row carries the event's title for display; the editor needs its
        // id, so the cell renders one and saves the other.
        value: (r) => r.eventId,
        render: (r) => (
          <span className={r.eventTitle ? "" : "text-[var(--mm-text-dim)]"}>
            {r.eventTitle ?? "— none —"}
          </span>
        ),
        editable: true,
        filterable: true,
        width: "16rem",
      },
      {
        key: "objectives",
        header: "Objectives",
        icon: "mdi:flag-outline",
        kind: "number",
        value: (r) => r.objectives,
        align: "right",
      },
      {
        key: "players",
        header: "Adventurers",
        icon: "mdi:account-group-outline",
        kind: "number",
        value: (r) => r.players,
        align: "right",
      },
      {
        key: "startsAt",
        header: "Opens",
        icon: "mdi:clock-start",
        kind: "datetime",
        value: (r) => (r.startsAt ? r.startsAt.toISOString() : null),
        editable: true,
      },
      {
        key: "endsAt",
        header: "Closes",
        icon: "mdi:clock-end",
        kind: "datetime",
        value: (r) => (r.endsAt ? r.endsAt.toISOString() : null),
        editable: true,
      },
      {
        key: "slug",
        header: "Slug",
        icon: "mdi:link-variant",
        value: (r) => r.slug,
        mono: true,
        hiddenByDefault: true,
      },
      {
        key: "id",
        header: "ID",
        icon: "mdi:identifier",
        value: (r) => r.id,
        mono: true,
        hiddenByDefault: true,
        searchable: false,
      },
    ],
    [events]
  );

  const runBulk = (ids: string[], active: boolean, clear: () => void) => {
    setBulkError(null);
    startBulk(async () => {
      const res = await setQuestsActive(ids, active);
      if (res.ok) clear();
      else setBulkError(res.error);
    });
  };

  return (
    <div className="space-y-3">
      {bulkError && <Flash tone="error">{bulkError}</Flash>}

      <DataTable
        rows={quests}
        columns={columns}
        rowId={(r) => r.id}
        onSave={updateQuestField}
        storageKey="admin-quests"
        accent={ACCENT.quests}
        initialSort={{ key: "startsAt", dir: "desc" }}
        caption="All quests, editable in place"
        searchPlaceholder="Search quests and events…"
        emptyMessage="No quests yet. Create one, then add an objective for each stand."
        primaryAction={{
          label: "New quest",
          icon: "mdi:plus",
          opensDialog: true,
          onClick: () => setCreating(true),
        }}
        bulkActions={(ids, clear) => (
          <>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => runBulk(ids, true, clear)}
              className="mm-btn mm-btn-ghost text-xs disabled:opacity-50"
            >
              <Icon icon="mdi:broadcast" width={14} /> Go live
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => runBulk(ids, false, clear)}
              className="mm-btn mm-btn-ghost text-xs disabled:opacity-50"
            >
              <Icon icon="mdi:pause" width={14} /> Take offline
            </button>
          </>
        )}
        rowActions={(r) => (
          <Link
            href={withReturn(`/admin/quests/${r.slug}`, BACK_TO_LIST)}
            className="mm-btn mm-btn-ghost text-xs"
          >
            <Icon icon="mdi:cog-outline" width={14} /> Manage
          </Link>
        )}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New quest"
        description="It starts offline, so you can build the trail before anyone can see it."
        icon="game-icons:treasure-map"
        accent={ACCENT.quests}
        size="lg"
      >
        <QuestCreateForm events={events} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
