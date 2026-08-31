/**
 * The bootstrap admin allowlist.
 *
 * ADMIN_EMAILS is how the first admin exists at all — before anyone can be
 * promoted from the admin panel, someone has to be able to open it. The jwt
 * callback in lib/auth.ts promotes these addresses on every session read,
 * which means the stored `role` of an allowlisted account is decorative: the
 * members screen shows that, and refuses edits that would silently do nothing.
 *
 * Read on every call rather than at module load — process.env is not
 * guaranteed to be populated when this module is first evaluated.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True when this address is an admin by environment, not by stored role. */
export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
