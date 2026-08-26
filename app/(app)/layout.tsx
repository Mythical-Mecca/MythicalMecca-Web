import { requireRole } from "@/lib/guard";
import { countMyPartnerships } from "@/lib/partner-access";
import { AppTopNav } from "@/components/app-top-nav";
import { AppBackdrop } from "@/components/app-backdrop";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("member");
  // Counted from partner_members rather than read off the JWT role, which goes
  // stale until the next sign-in — see the note in <AppTopNav>.
  const hasPartner = (await countMyPartnerships(session.user.id)) > 0;

  return (
    <>
      <AppBackdrop />
      {/* The nav is built here — it closes over a sign-out server action — but
          <AppShell> decides whether the route wants it. See the note there on
          focus routes. */}
      <AppShell
        nav={<AppTopNav role={session.user.role} hasPartner={hasPartner} />}
      >
        {children}
      </AppShell>
    </>
  );
}
