import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import type { Role } from "@/lib/rbac";

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
});
