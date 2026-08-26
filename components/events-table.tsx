"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Drawer } from "@/components/drawer";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";
import {
  OpenLinkDialog,
  type LinkChoice,
} from "@/components/open-link-dialog";
import { EventCreateForm, type PartnerOption } from "@/components/event-create-form";
import { setEventsStatus, updateEventField } from "@/app/(admin)/actions-events";
import type { AdminEventRow } from "@/lib/admin";
import { withReturn, type ReturnTo } from "@/lib/return-to";

/** Where anything opened from this screen should return to. */
const BACK_TO_LIST: ReturnTo = { href: "/admin/events", label: "all events" };

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "var(--mm-text-dim)", icon: "mdi:file-outline" },
  { value: "published", label: "Published", color: "var(--mm-live)", icon: "mdi:check-circle-outline" },
  { value: "live", label: "Live", color: "var(--mm-gold)", icon: "mdi:broadcast" },
  { value: "ended", label: "Ended", color: "var(--mm-text-dim)", icon: "mdi:flag-checkered" },
  { value: "cancelled", label: "Cancelled", color: "var(--mm-danger)", icon: "mdi:close-circle-outline" },
  { value: "pending", label: "Pending", color: "var(--mm-gold)", icon: "mdi:clock-outline" },
  { value: "rejected", label: "Rejected", color: "var(--mm-danger)", icon: "mdi:cancel" },
];

const ORIGIN_OPTIONS = [
  { value: "hosted", label: "Official", color: "var(--mm-violet)", icon: "game-icons:castle" },
  { value: "partner", label: "Partner", color: "var(--mm-blue)", icon: "game-icons:anvil" },
  { value: "external", label: "External", color: "var(--mm-text-dim)", icon: "mdi:web" },
  { value: "community", label: "Community", color: "var(--mm-live)", icon: "mdi:account-group-outline" },
];

/**
 * Everywhere a single event can be opened from. The treasure hunt only appears
 * when one is attached, which is most of the point of listing them: you can
 * see at a glance whether an event has a quest without leaving the table.
 */
function destinations(r: AdminEventRow): LinkChoice[] {
  return [
    {
      label: "View Public Event Page",
      href: `/events/${r.slug}`,
      icon: "game-icons:campfire",
      hint: "What adventurers see",
    },
    ...r.quests.map((q) => ({
      label:
        r.quests.length > 1 ? `View Treasure Hunt — ${q.title}` : "View Treasure Hunt",
      href: `/quests/${q.slug}`,
      icon: "game-icons:treasure-map",
      hint: r.quests.length > 1 ? undefined : q.title,
    })),
    {
      label: "Manage Event",
      href: withReturn(`/admin/events/${r.id}`, BACK_TO_LIST),
      icon: "mdi:cog-outline",
      hint: "Details, gallery, quests, community",
    },
  ];
}

/** Statuses worth a one-click bulk move. The rest are per-row decisions. */
const BULK_STATUSES = [
  { value: "published", label: "Publish", icon: "mdi:check-circle-outline" },
  { value: "draft", label: "Unpublish", icon: "mdi:file-outline" },
  { value: "cancelled", label: "Cancel", icon: "mdi:close-circle-outline" },
];

export function EventsTable({
  events,
  partners,
}: {
  events: AdminEventRow[];
  partners: PartnerOption[];
}) {
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, startBulk] = useTransition();

  const columns = useMemo<DataTableColumn<AdminEventRow>[]>(
    () => [
      {
        key: "title",
        header: "Title",
        icon: "mdi:format-title",
        value: (r) => r.title,
        editable: true,
        required: true,
        width: "20rem",
        placeholder: "Event name",
        prefix: (r) => (
          <OpenLinkDialog label={r.title} title="Open" items={destinations(r)} />
        ),
      },
      {
        key: "status",
        header: "Status",
        icon: "mdi:flag-outline",
        kind: "select",
        options: STATUS_OPTIONS,
        value: (r) => r.status,
        editable: true,
        filterable: true,
        required: true,
      },
      {
        key: "origin",
        header: "Origin",
        icon: "mdi:source-branch",
        kind: "select",
        options: ORIGIN_OPTIONS,
        value: (r) => r.origin,
        editable: true,
        filterable: true,
        required: true,
      },
      {
        key: "startsAt",
        header: "Starts",
        icon: "mdi:calendar-start",
        kind: "datetime",
        value: (r) => r.startsAt,
        editable: true,
      },
      {
        key: "endsAt",
        header: "Ends",
        icon: "mdi:calendar-end",
        kind: "datetime",
        value: (r) => r.endsAt,
        editable: true,
      },
      {
        key: "location",
        header: "Location",
        icon: "mdi:map-marker-outline",
        value: (r) => r.location,
        editable: true,
        placeholder: "Where?",
      },
      {
        key: "partnerId",
        header: "Partner",
        icon: "game-icons:anvil",
        kind: "select",
        // The row already carries the joined name, but the editor needs the
        // id — so the options carry both and the badge reads as the name.
        options: partners.map((p) => ({
          value: p.id,
          label: p.name,
          color: "var(--mm-blue)",
        })),
        value: (r) => r.partnerId,
        editable: true,
        filterable: true,
      },
      {
        key: "capacity",
        header: "Capacity",
        icon: "mdi:account-multiple-outline",
        kind: "number",
        value: (r) => r.capacity,
        editable: true,
        align: "right",
        placeholder: "—",
      },
      {
        key: "summary",
        header: "Summary",
        icon: "mdi:text-short",
        kind: "textarea",
        value: (r) => r.summary,
        editable: true,
        width: "22rem",
        placeholder: "One-line teaser",
      },
      {
        key: "slug",
        header: "Slug",
        icon: "mdi:link-variant",
        value: (r) => r.slug,
        editable: true,
        required: true,
        mono: true,
        validate: (v) =>
          /^[a-z0-9-]+$/.test(v.trim())
            ? null
            : "Lowercase letters, numbers and hyphens only.",
      },
      {
        key: "bodyMd",
        header: "Details",
        icon: "mdi:text-long",
        kind: "textarea",
        value: (r) => r.bodyMd,
        editable: true,
        hiddenByDefault: true,
        width: "22rem",
      },
      {
        key: "sourceName",
        header: "Source",
        icon: "mdi:web",
        value: (r) => r.sourceName,
        editable: true,
        hiddenByDefault: true,
      },
      {
        key: "externalUrl",
        header: "External link",
        icon: "mdi:open-in-new",
        kind: "url",
        value: (r) => r.externalUrl,
        editable: true,
        hiddenByDefault: true,
      },
      {
        key: "lat",
        header: "Latitude",
        icon: "mdi:latitude",
        kind: "number",
        value: (r) => r.lat,
        editable: true,
        hiddenByDefault: true,
        align: "right",
        mono: true,
      },
      {
        key: "lng",
        header: "Longitude",
        icon: "mdi:longitude",
        kind: "number",
        value: (r) => r.lng,
        editable: true,
        hiddenByDefault: true,
        align: "right",
        mono: true,
      },
      {
        key: "reviewNote",
        header: "Review note",
        icon: "mdi:comment-text-outline",
        kind: "textarea",
        value: (r) => r.reviewNote,
        editable: true,
        hiddenByDefault: true,
      },
      {
        key: "createdAt",
        header: "Created",
        icon: "mdi:clock-plus-outline",
        kind: "datetime",
        value: (r) => r.createdAt,
        hiddenByDefault: true,
      },
      {
        key: "updatedAt",
        header: "Updated",
        icon: "mdi:clock-edit-outline",
        kind: "datetime",
        value: (r) => r.updatedAt,
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
    [partners]
  );

  const runBulk = (ids: string[], status: string, clear: () => void) => {
    setBulkError(null);
    startBulk(async () => {
      const res = await setEventsStatus(ids, status);
      if (res.ok) clear();
      else setBulkError(res.error);
    });
  };

  return (
    <div className="space-y-3">
      {bulkError && <Flash tone="error">{bulkError}</Flash>}

      <DataTable
        rows={events}
        columns={columns}
        rowId={(r) => r.id}
        onSave={updateEventField}
        storageKey="admin-events"
        accent="#5cc08c"
        initialSort={{ key: "startsAt", dir: "desc" }}
        caption="All events, editable in place"
        searchPlaceholder="Search events, locations, partners…"
        emptyMessage="No events yet. Schedule the first one."
        toolbar={
          <Drawer title="New event" triggerLabel="New event" triggerIcon="mdi:plus">
            <EventCreateForm partners={partners} />
          </Drawer>
        }
        bulkActions={(ids, clear) =>
          BULK_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={bulkPending}
              onClick={() => runBulk(ids, s.value, clear)}
              className="mm-btn mm-btn-ghost text-xs disabled:opacity-50"
            >
              <Icon icon={s.icon} width={14} />
              {s.label}
            </button>
          ))
        }
        rowActions={(r) => (
          <>
            {r.origin === "community" && (
              <Link
                href="/admin/events/queue"
                className="mm-btn mm-btn-ghost text-xs"
                title="Moderate community submissions"
              >
                <Icon icon="mdi:gavel" width={14} />
                Queue
              </Link>
            )}
          </>
        )}
      />
    </div>
  );
}
