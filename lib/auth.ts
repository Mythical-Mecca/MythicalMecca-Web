import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import type { Role } from "@/lib/rbac";

/**
 * Pull a provider avatar (Google/Discord) into our own Blob the first time we
 * see a user, and save it as their avatar. Self-hosted = always renderable and
 * stable even if the provider URL rotates. Runs once: skipped if avatarUrl set.
 */
async function importSocialAvatar(userId?: string, src?: string | null) {
  if (!userId || !src || !process.env.BLOB_READ_WRITE_TOKEN) return;
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
        token.role = ((user as { role?: Role }).role ?? "member") as Role;
      }
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
