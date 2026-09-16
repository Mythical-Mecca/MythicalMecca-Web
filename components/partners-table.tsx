"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";
import {
  OpenLinkDialog,
  type LinkChoice,
} from "@/components/open-link-dialog";
import {
  setPartnersActive,
  setPartnersStatus,
  updatePartnerField,
} from "@/app/(admin)/actions-partners";
import type { AdminPartner } from "@/lib/partner";
import { withReturn, type ReturnTo } from "@/lib/return-to";

const BACK_TO_LIST: ReturnTo = { href: "/admin/partners", label: "all partners" };

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "var(--mm-text-dim)", icon: "mdi:file-outline" },
  { value: "pending", label: "In review", color: "var(--mm-gold)", icon: "mdi:clock-outline" },
  { value: "approved", label: "Approved", color: "var(--mm-live)", icon: "mdi:check-circle-outline" },
  { value: "rejected", label: "Changes requested", color: "var(--mm-danger)", icon: "mdi:cancel" },
];

const YES_NO = [
  { value: "1", label: "Yes", color: "var(--mm-live)", icon: "mdi:check" },
  { value: "0", label: "No", color: "var(--mm-text-dim)", icon: "mdi:minus" },
];

export type CategoryOption = { id: string; name: string };

/**
 * Everywhere one partner can be opened from. The public page is a preview
 * until the partner is approved and active — the same link, but the reader
 * should know which they're getting.
 */
function destinations(r: AdminPartner): LinkChoice[] {
  const live = r.status === "approved" && r.active;
  return [
    {
      label: live ? "View public page" : "Preview public page",
      href: live ? `/partners/${r.slug}` : `/partners/${r.slug}?preview=1`,
      icon: "game-icons:anvil",
      hint: live ? "What visitors see" : "Not public yet — admin preview",
    },
    {
      label: "Manage partner",
      href: withReturn(`/admin/partners/${r.id}`, BACK_TO_LIST),
      icon: "mdi:cog-outline",
      hint: "Details, gallery, products, team",
    },
    {
      label: "Open in Partner Hub",
      href: `/partner-hub/${r.id}`,
      icon: "mdi:storefront-outline",
      hint: "What the stallholder sees",
    },
  ];
}

export function PartnersTable({
  partners,
  categories,
}: {
  partners: AdminPartner[];
  categories: CategoryOption[];
}) {
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, startBulk] = useTransition();

  const columns = useMemo<DataTableColumn<AdminPartner>[]>(
    () => [
      {
        key: "businessName",
        header: "Partner",
        icon: "mdi:storefront-outline",
        value: (r) => r.businessName,
        editable: true,
        required: true,
        width: "18rem",
        placeholder: "Business name",
        prefix: (r) => (
          <span className="flex items-center gap-2">
            {r.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={r.logoUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                <Icon icon="game-icons:anvil" width={14} />
              </span>
            )}
            <OpenLinkDialog label={r.businessName} title="Open" items={destinations(r)} />
          </span>
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
        key: "active",
        header: "Listed",
        icon: "mdi:eye-outline",
        kind: "select",
        options: YES_NO,
        value: (r) => (r.active ? "1" : "0"),
        editable: true,
        filterable: true,
        required: true,
      },
      {
        key: "categoryId",
        header: "Category",
        icon: "mdi:shape-outline",
        kind: "select",
        options: categories.map((c) => ({
          value: c.id,
          label: c.name,
          color: "var(--mm-blue)",
        })),
        value: (r) => r.categoryId,
        editable: true,
        filterable: true,
      },
      {
        key: "isPremium",
        header: "Premium",
        icon: "mdi:crown-outline",
        kind: "select",
        options: YES_NO,
        value: (r) => (r.isPremium ? "1" : "0"),
        editable: true,
        filterable: true,
        required: true,
      },
      {
        key: "memberCount",
        header: "Team",
        icon: "mdi:account-multiple-outline",
        kind: "number",
        value: (r) => r.memberCount,
        align: "right",
        searchable: false,
      },
      {
        key: "offeringCount",
        header: "Products",
        icon: "mdi:tag-outline",
        kind: "number",
        value: (r) => r.offeringCount,
        align: "right",
        searchable: false,
      },
      {
        key: "galleryCount",
        header: "Photos",
        icon: "mdi:image-multiple-outline",
        kind: "number",
        value: (r) => r.galleryCount,
        align: "right",
        searchable: false,
        hiddenByDefault: true,
      },
      {
        key: "tagline",
        header: "Tagline",
        icon: "mdi:text-short",
        value: (r) => r.tagline,
        editable: true,
        width: "20rem",
        placeholder: "One-liner",
      },
      {
        key: "shopUrl",
        header: "Shop",
        icon: "mdi:cart-outline",
        kind: "url",
        value: (r) => r.shopUrl,
        editable: true,
        hiddenByDefault: true,
      },
      {
        key: "slug",
        header: "Slug",
        icon: "mdi:link-variant",
        value: (r) => r.slug,
        editable: true,
        required: true,
        mono: true,
        hiddenByDefault: true,
        validate: (v) =>
          /^[a-z0-9-]+$/.test(v.trim())
            ? null
            : "Lowercase letters, numbers and hyphens only.",
      },
      {
        key: "bio",
        header: "Bio",
        icon: "mdi:text-long",
        kind: "textarea",
        value: (r) => r.bio,
        editable: true,
        hiddenByDefault: true,
        width: "22rem",
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
        key: "submittedAt",
        header: "Submitted",
        icon: "mdi:send-clock-outline",
        kind: "datetime",
        value: (r) => r.submittedAt,
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
    [categories]
  );

  const run = (
    ids: string[],
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    clear: () => void
  ) => {
    setBulkError(null);
    startBulk(async () => {
      const res = await fn();
      if (res.ok) clear();
      else setBulkError(res.error);
    });
  };

  return (
    <div className="space-y-3">
      {bulkError && <Flash tone="error">{bulkError}</Flash>}

      <DataTable
        rows={partners}
        columns={columns}
        rowId={(r) => r.id}
        onSave={updatePartnerField}
        storageKey="admin-partners"
        accent="#E18D01"
        initialSort={{ key: "updatedAt", dir: "desc" }}
        caption="All partners, editable in place"
        searchPlaceholder="Search partners, taglines, categories…"
        emptyMessage="No partners yet. Add the first one."
        toolbar={
          <Link href="/admin/partners/new" className="mm-btn mm-btn-primary text-sm">
            <Icon icon="mdi:plus" width={16} /> Add partner
          </Link>
        }
        bulkActions={(ids, clear) => (
          <>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => run(ids, () => setPartnersStatus(ids, "approved"), clear)}
              className="mm-btn mm-btn-ghost text-xs disabled:opacity-50"
            >
              <Icon icon="mdi:check-circle-outline" width={14} /> Approve
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => run(ids, () => setPartnersActive(ids, true), clear)}
              className="mm-btn mm-btn-ghost text-xs disabled:opacity-50"
            >
              <Icon icon="mdi:eye-outline" width={14} /> List
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => run(ids, () => setPartnersActive(ids, false), clear)}
              className="mm-btn mm-btn-ghost text-xs disabled:opacity-50"
            >
              <Icon icon="mdi:eye-off-outline" width={14} /> Unlist
            </button>
          </>
        )}
        rowActions={(r) =>
          r.status === "pending" ? (
            <Link
              href="/admin/partners/queue"
              className="mm-btn mm-btn-ghost text-xs"
              title="Review this submission"
            >
              <Icon icon="mdi:gavel" width={14} />
              Review
            </Link>
          ) : null
        }
      />
    </div>
  );
}
