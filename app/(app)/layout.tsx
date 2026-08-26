import { requireRole } from "@/lib/guard";
import { AppTopNav } from "@/components/app-top-nav";
import { AppBackdrop } from "@/components/app-backdrop";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("member");

  return (
    <>
      <AppBackdrop />
      {/* The nav is built here — it closes over a sign-out server action — but
          <AppShell> decides whether the route wants it. See the note there on
          focus routes. */}
      <AppShell nav={<AppTopNav role={session.user.role} />}>
        {children}
      </AppShell>
    </>
  );
}
