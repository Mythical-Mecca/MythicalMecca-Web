"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ConfirmButton } from "@/components/confirm-button";
import { Modal } from "@/components/modal";
import { TextareaField } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import {
  banMember,
  unbanMember,
  updateMemberField,
} from "@/app/(admin)/actions-users";
import { ACCENT } from "@/lib/accents";
import type { AdminMember } from "@/lib/admin-users";

const ROLE_OPTIONS = [
  {
    value: "member",
    label: "Member",
    color: "var(--mm-text-dim)",
    icon: "mdi:account-outline",
  },
  {
    value: "partner",
    label: "Partner",
    color: ACCENT.partners,
    icon: "game-icons:anvil",
  },
  {
    value: "admin",
    label: "Admin",
    color: ACCENT.admin,
    icon: "mdi:shield-crown-outline",
  },
];

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    color: "var(--mm-live)",
    icon: "mdi:check-circle-outline",
  },
  {
    value: "banned",
    label: "Banned",
    color: "var(--mm-danger)",
    icon: "mdi:cancel",
  },
];

/**
 * The members screen.
 *
 * Role is edited inline — granting admin is a one-cell change — and the server
 * refuses the two edits that would be a mistake (your own account, and an
 * ADMIN_EMAILS address whose stored role is decorative), so the table doesn't
 * have to know those rules to be safe.
 *
 * Banning is deliberately not a cell. It wants a reason recorded against the
 * account and a beat of hesitation, so it opens a dialog, and the reason
 * travels with the ban into the activity log.
 */
export function MembersTable({
  members,
  currentUserId,
}: {
  members: AdminMember[];
  currentUserId: string;
}) {
  const [banning, setBanning] = useState<AdminMember | null>(null);

  const columns = useMemo<DataTableColumn<AdminMember>[]>(
    () => [
      {
        key: "name",
        header: "Member",
        icon: "mdi:account-outline",
        value: (r) => r.name,
        width: "16rem",
        prefix: (r) =>
          r.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.avatarUrl}
              alt=""
              loading="lazy"
              className="h-7 w-7 shrink-0 rounded-full border border-[var(--mm-border)] object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--mm-border)] text-[var(--mm-text-dim)]"
            >
              <Icon icon="mdi:account" width={14} />
            </span>
          ),
        render: (r) => (
          <span className="flex flex-wrap items-center gap-2">
            <span>{r.name ?? "Unnamed"}</span>
            {r.id === currentUserId && (
              <Badge color={ACCENT.admin} icon="mdi:account-check-outline">
                You
              </Badge>
            )}
            {r.allowlisted && (
              <Badge
                color={ACCENT.admin}
                icon="mdi:key-variant"
                title="Admin via the ADMIN_EMAILS environment variable"
              >
                Allowlisted
              </Badge>
            )}
          </span>
        ),
      },
      {
        key: "email",
        header: "Email",
        icon: "mdi:email-outline",
        value: (r) => r.email,
        width: "18rem",
      },
      {
        key: "role",
        header: "Role",
        icon: "mdi:shield-account-outline",
        kind: "select",
        options: ROLE_OPTIONS,
        value: (r) => r.role,
        editable: true,
        filterable: true,
      },
      {
        key: "status",
        header: "Status",
        icon: "mdi:gavel",
        kind: "select",
        options: STATUS_OPTIONS,
        value: (r) => (r.banned ? "banned" : "active"),
        filterable: true,
      },
      {
        key: "bannedReason",
        header: "Ban reason",
        icon: "mdi:comment-alert-outline",
        value: (r) => r.bannedReason,
        width: "16rem",
        render: (r) =>
          r.banned ? (
            <span className="text-[var(--mm-text-dim)]">
              {r.bannedReason ?? "No reason recorded"}
              {r.bannedByName ? ` · by ${r.bannedByName}` : ""}
            </span>
          ) : (
            <span className="text-[var(--mm-text-dim)]">—</span>
          ),
      },
      {
        key: "providers",
        header: "Signs in with",
        icon: "mdi:login-variant",
        value: (r) => r.providers,
        render: (r) =>
          r.providers ? (
            <span className="capitalize">{r.providers}</span>
          ) : (
            <span className="text-[var(--mm-text-dim)]">—</span>
          ),
      },
      {
        key: "createdAt",
        header: "Joined",
        icon: "mdi:calendar-plus",
        kind: "datetime",
        value: (r) => r.createdAt,
      },
      {
        key: "lastSeenAt",
        header: "Last seen",
        icon: "mdi:clock-outline",
        kind: "datetime",
        value: (r) => r.lastSeenAt,
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
    [currentUserId]
  );

  return (
    <>
      <DataTable
        rows={members}
        columns={columns}
        rowId={(r) => r.id}
        onSave={updateMemberField}
        storageKey="admin-members"
        accent={ACCENT.admin}
        initialSort={{ key: "createdAt", dir: "desc" }}
        caption="Everyone with an account, their role, and whether they are banned"
        searchPlaceholder="Search names and emails…"
        emptyMessage="No accounts yet."
        rowActions={(r) =>
          /* Lifting a ban comes first: an allowlisted address can have been
             banned before it was added to ADMIN_EMAILS, and hiding the control
             would strand the account. */
          r.banned ? (
            <form action={unbanMember}>
              <input type="hidden" name="id" value={r.id} />
              <ConfirmButton
                label="Lift ban"
                confirmLabel="Lift the ban"
                title={`Let ${r.name ?? r.email ?? "them"} back in?`}
                body="They can sign in again straight away, with the role they had."
                icon="mdi:lock-open-variant-outline"
                tone="normal"
                className="mm-btn mm-btn-ghost text-xs"
              />
            </form>
          ) : r.id === currentUserId || r.allowlisted ? (
            <span className="text-xs text-[var(--mm-text-dim)]">
              {r.id === currentUserId
                ? "Your own account"
                : "Managed by ADMIN_EMAILS"}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setBanning(r)}
              aria-haspopup="dialog"
              className="mm-btn mm-btn-ghost text-xs"
            >
              <Icon icon="mdi:cancel" width={14} /> Ban
            </button>
          )
        }
      />

      <Modal
        open={!!banning}
        onClose={() => setBanning(null)}
        title={`Ban ${banning?.name ?? banning?.email ?? "this member"}?`}
        description="They can't sign in, and a session they already have open ends within a minute. Nothing they have posted is deleted."
        icon="mdi:cancel"
        accent="var(--mm-danger)"
        size="sm"
      >
        <form action={banMember} className="space-y-5">
          <input type="hidden" name="id" value={banning?.id ?? ""} />
          <TextareaField
            name="reason"
            label="Reason"
            hint="optional"
            icon="mdi:comment-alert-outline"
            rows={3}
            placeholder="e.g. Repeated harassment in event chat"
            description="Kept on the account and in the activity log. The member never sees it."
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setBanning(null)}
              className="mm-btn mm-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mm-btn"
              style={{ background: "var(--mm-danger)", color: "#160f0a" }}
            >
              <Icon icon="mdi:cancel" width={16} /> Ban member
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
