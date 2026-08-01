import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { normalizeRole, type Role } from "@/lib/rbac";

/**
 * Pull a provider avatar (Google/Discord) into our own Blob the first time we
 * see a user, and save it as their avatar. Self-hosted = always renderable and
 * stable even if the provider URL rotates. Runs once: skipped if avatarUrl set.
 */
async function importSocialAvatar(userId?: string, src?: string | null) {
  const hasBlobAuth = !!(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
  );
  if (!userId || !src || !hasBlobAuth) return;
  try {
    const [row] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (row?.avatarUrl) return; // already imported / custom avatar set

    const res = await fetch(src);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("gif")
      ? "gif"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg")
          ? "jpg"
          : "png";
    const blob = await put(`avatars/${userId}.${ext}`, buf, {
      access: "public",
      contentType,
      allowOverwrite: true,
    });
    await db
      .update(users)
      .set({ avatarUrl: blob.url })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error("[auth] avatar import failed", err);
  }
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Local-only sign-in bypass (triggered by 5 clicks on the visitor logo).
 * Defense in depth — the UI trigger is NOT the security boundary:
 *  1. The provider is only registered when NODE_ENV === "development"
 *     (never true in a production build, on Vercel or anywhere else).
 *  2. authorize() re-checks the env AND that the request host is localhost.
 */
const DEV_LOGIN_ENABLED = process.env.NODE_ENV === "development";
const DEV_LOGIN_EMAIL = process.env.DEV_LOGIN_EMAIL ?? "test@localhost.dev";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const devBypassProvider = Credentials({
  id: "dev-bypass",
  name: "Dev bypass",
  credentials: {},
  async authorize(_credentials, request) {
    if (process.env.NODE_ENV !== "development") return null;
    if (!process.env.DATABASE_URL) return null;
    try {
      if (!LOCAL_HOSTS.has(new URL(request.url).hostname)) return null;
    } catch {
      return null;
    }
    // Find-or-create the test account (member role; add DEV_LOGIN_EMAIL to
    // ADMIN_EMAILS locally if you need the admin view).
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEV_LOGIN_EMAIL))
      .limit(1);
    const user =
      existing ??
      (
        await db
          .insert(users)
          .values({
            email: DEV_LOGIN_EMAIL,
            name: "Test Adventurer",
            role: "member",
          })
          .returning()
      )[0];
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    // Same-email accounts link to one profile, so a member can sign in with
    // either Google or Discord (and link both from their character sheet).
    Google({ allowDangerousEmailAccountLinking: true }),
    Discord({ allowDangerousEmailAccountLinking: true }),
    ...(DEV_LOGIN_ENABLED ? [devBypassProvider] : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is present on initial sign-in (from the Drizzle adapter row).
      if (user) {
        token.uid = user.id;
        token.role = normalizeRole((user as { role?: string }).role ?? "member");
      }
      // Heal legacy "vendor" roles carried in older JWTs after the rename.
      if (token.role) token.role = normalizeRole(token.role as string);
      // Bootstrap admins from the allowlist regardless of stored role.
      if (token.email && ADMIN_EMAILS.includes(token.email.toLowerCase())) {
        token.role = "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as Role) ?? "member";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      await importSocialAvatar(user.id, user.image);
    },
  },
});
