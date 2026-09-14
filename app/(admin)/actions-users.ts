"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { isAllowlistedAdmin } from "@/lib/admin-emails";
import { logActivity } from "@/lib/logging";
import { ASSIGNABLE_ROLES } from "@/lib/admin-users";

/**
 * Managing the people, from /admin/users.
 *
 * Two rules run through everything here, and both are enforced on the server
 * because the table that calls it is a client component:
 *
 *  - You may not act on yourself. Demoting or banning the account you are
 *    signed in as is never what someone means to do, and with one admin left
 *    it locks the panel for good.
 *  - You may not act on an ADMIN_EMAILS account. The jwt callback re-promotes
 *    those on every session read (lib/admin-emails.ts), so a stored-role edit
 *    would look like it worked and change nothing. Take the address out of the
 *    environment variable first.
 *
 * A role change or a ban lands on the target's own session within a minute —
 * see ROLE_REFRESH_MS in lib/auth.ts.
 */

const ERRORS = {
  auth: "auth",
  self: "self",
  allowlisted: "allowlisted",
  missing: "missing",
  db: "db",
  input: "input",
} as const;
type ErrorCode = (typeof ERRORS)[keyof typeof ERRORS];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roleAtLeast(session.user.role, "admin")) redirect("/");
  return session;
}

function fail(code: ErrorCode): never {
  redirect(`/admin/users?error=${code}`);
}

/** The target of an action, once it is known to exist and be actionable. */
async function loadTarget(id: string, actorId: string) {
  let row:
    | {
        id: string;
        name: string | null;
        email: string | null;
        role: (typeof ASSIGNABLE_ROLES)[number];
        bannedAt: Date | null;
      }
    | undefined;
  try {
    [row] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        bannedAt: users.bannedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
  } catch {
    return { row: null, problem: ERRORS.db as ErrorCode };
  }
  if (!row) return { row: null, problem: ERRORS.missing as ErrorCode };
  if (row.id === actorId) return { row, problem: ERRORS.self as ErrorCode };
  if (isAllowlistedAdmin(row.email)) {
    return { row, problem: ERRORS.allowlisted as ErrorCode };
  }
  return { row, problem: null };
}

// ---------------------------------------------------------------------------
// Roles — inline edits from the members table
// ---------------------------------------------------------------------------

export type MemberSaveResult = { ok: true } | { ok: false; error: string };

const roleSchema = z.enum(ASSIGNABLE_ROLES);

/**
 * The DataTable save contract: `(id, column, value)` in, `{ ok }` or a message
 * out. Role is the only editable column — everything else about a member is
 * either theirs to change or a record of something that happened.
 */
export async function updateMemberField(
  id: string,
  field: string,
  value: string
): Promise<MemberSaveResult> {
  const session = await auth();
  if (!session?.user || !roleAtLeast(session.user.role, "admin")) {
    return { ok: false, error: "Not authorised." };
  }
  if (field !== "role") {
    return { ok: false, error: "That field can't be edited here." };
  }
  const parsed = roleSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: "Unknown role." };
  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "No database configured." };
  }

  const { row, problem } = await loadTarget(id, session.user.id);
  if (problem === ERRORS.db) {
    return { ok: false, error: "Could not reach the database." };
  }
  if (problem === ERRORS.missing || !row) {
    return { ok: false, error: "That account no longer exists." };
  }
  if (problem === ERRORS.self) {
    return { ok: false, error: "You can't change your own role." };
  }
  if (problem === ERRORS.allowlisted) {
    return {
      ok: false,
      error:
        "This address is an admin via ADMIN_EMAILS — remove it there first.",
    };
  }
  if (row.role === parsed.data) return { ok: true };

  try {
    await db
      .update(users)
      .set({ role: parsed.data })
      .where(eq(users.id, id));
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  await logActivity({
    actorId: session.user.id,
    action: "user.role_change",
    entityType: "user",
    entityId: id,
    metadata: { from: row.role, to: parsed.data, email: row.email },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Bans
// ---------------------------------------------------------------------------

const banSchema = z.object({
  id: z.string().min(1).max(64),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Bar an account. The row stays — their events, reviews and quest progress
 * remain attributable, and the ban is reversible from the same screen.
 */
export async function banMember(formData: FormData) {
  const session = await requireAdmin();
  const parsed = banSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) fail(ERRORS.input);
  if (!process.env.DATABASE_URL) fail(ERRORS.db);

  const { row, problem } = await loadTarget(parsed.data.id, session.user.id);
  if (problem || !row) fail(problem ?? ERRORS.missing);

  try {
    await db
      .update(users)
      .set({
        bannedAt: new Date(),
        bannedReason: parsed.data.reason ?? null,
        bannedBy: session.user.id,
      })
      .where(eq(users.id, row.id));
  } catch {
    fail(ERRORS.db);
  }

  await logActivity({
    actorId: session.user.id,
    action: "user.ban",
    entityType: "user",
    entityId: row.id,
    metadata: { email: row.email, reason: parsed.data.reason ?? null },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?done=banned");
}

/**
 * Lift a ban. They can sign in again immediately.
 *
 * The ADMIN_EMAILS rule does not apply here, and deliberately: an address can
 * be added to that variable after the account was banned, and refusing then
 * would leave an account that cannot sign in and cannot be released from any
 * screen. Lifting a ban grants nothing the environment hasn't already granted.
 */
export async function unbanMember(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) fail(ERRORS.input);
  if (!process.env.DATABASE_URL) fail(ERRORS.db);

  const { row, problem } = await loadTarget(id, session.user.id);
  const blocking = problem === ERRORS.allowlisted ? null : problem;
  if (blocking || !row) fail(blocking ?? ERRORS.missing);

  try {
    await db
      .update(users)
      .set({ bannedAt: null, bannedReason: null, bannedBy: null })
      .where(eq(users.id, row.id));
  } catch {
    fail(ERRORS.db);
  }

  await logActivity({
    actorId: session.user.id,
    action: "user.unban",
    entityType: "user",
    entityId: row.id,
    metadata: { email: row.email },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?done=unbanned");
}
