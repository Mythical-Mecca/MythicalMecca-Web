import { requireRole } from "@/lib/guard";
import { AppTopNav } from "@/components/app-top-nav";
import { AppBackdrop } from "@/components/app-backdrop";
import { QuickLaunch } from "@/components/quick-launch";
import { PageNav } from "@/components/page-nav";
import { FocusRoute } from "@/components/focus-route";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("member");

  return (
    <div className="flex min-h-full flex-col">
      <AppBackdrop />
      <AppTopNav role={session.user.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <FocusRoute>
          <QuickLaunch />
          <div className="mt-6 empty:hidden">
            <PageNav />
          </div>
        </FocusRoute>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
