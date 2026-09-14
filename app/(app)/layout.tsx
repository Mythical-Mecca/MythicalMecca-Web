import { requireRole } from "@/lib/guard";
import { AppBackdrop } from "@/components/app-backdrop";
import { AppShell } from "@/components/app-shell";
import { SiteNav } from "@/components/site-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("member");

  return (
    <>
      <AppBackdrop />
      <AppShell nav={<SiteNav />}>{children}</AppShell>
    </>
  );
}
