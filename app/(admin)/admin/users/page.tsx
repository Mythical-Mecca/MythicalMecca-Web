import { PageHeading } from "@/components/page-heading";
import { Flash } from "@/components/flash";
import { MembersTable } from "@/components/members-table";
import { listMembers } from "@/lib/admin-users";
import { requireRole } from "@/lib/guard";
import { ACCENT } from "@/lib/accents";

export const metadata = { title: "Members · Admin" };

/** Why an action was refused, in words. Codes come from actions-users.ts. */
const ERRORS: Record<string, string> = {
  self: "You can't ban or demote your own account.",
  allowlisted:
    "That address is an admin via the ADMIN_EMAILS environment variable — remove it there first.",
  missing: "That account no longer exists.",
  db: "Could not reach the database. Nothing was changed.",
  input: "Something was missing from that request. Nothing was changed.",
  auth: "You are not authorised to do that.",
};

const DONE: Record<string, string> = {
  banned: "Member banned. Their session ends within a minute.",
  unbanned: "Ban lifted — they can sign in again.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  // The layout already gates the whole section; this is here for the id, which
  // the table needs to grey out the admin's own row.
  const session = await requireRole("admin");
  const [members, { done, error }] = await Promise.all([
    listMembers(),
    searchParams,
  ]);

  const admins = members.filter(
    (m) => m.role === "admin" || m.allowlisted
  ).length;
  const banned = members.filter((m) => m.banned).length;

  return (
    <div className="space-y-8">
      <PageHeading
        size="md"
        title="Members"
        subtitle={`Everyone with an account — ${members.length} in all, ${admins} with admin, ${banned} banned.`}
        icon="mdi:account-group-outline"
        accent={ACCENT.admin}
      />

      {done && <Flash>{DONE[done] ?? "Done."}</Flash>}
      {error && (
        <Flash tone="error">{ERRORS[error] ?? "That didn't work."}</Flash>
      )}

      {!process.env.DATABASE_URL && (
        <Flash tone="info">
          No database connected — there are no accounts to manage. Set
          DATABASE_URL and run the migrations to go live.
        </Flash>
      )}

      <MembersTable members={members} currentUserId={session.user.id} />

      <p className="text-xs text-[var(--mm-text-dim)]">
        Role changes and bans reach the member&apos;s own session within a
        minute — they don&apos;t need to sign out and back in. An address listed
        in ADMIN_EMAILS is an admin whatever its stored role says, so those
        accounts can only be changed by editing that environment variable.
      </p>
    </div>
  );
}
