import { requireRole } from "@/lib/guard";
import { getLiveEvent } from "@/lib/content";
import { AppTopNav } from "@/components/app-top-nav";
import { AppBackdrop } from "@/components/app-backdrop";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("member");
  const liveEvent = await getLiveEvent();

  return (
    <div className="flex min-h-full flex-col">
      <AppBackdrop />
      <AppTopNav
        role={session.user.role}
        liveEvent={
          liveEvent ? { slug: liveEvent.slug, title: liveEvent.title } : null
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Breadcrumbs />
        <div className="mt-5">{children}</div>
      </main>
    </div>
  );
}
