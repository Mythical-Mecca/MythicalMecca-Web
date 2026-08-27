import { auth } from "@/lib/auth";
import { countMyPartnerships } from "@/lib/partner-access";
import { AppTopNav } from "@/components/app-top-nav";
import { AppBackdrop } from "@/components/app-backdrop";
import { AppShell } from "@/components/app-shell";
import { PublicTopNav } from "@/components/public-top-nav";

/**
 * Members-only pages that are nonetheless publicly *readable* — a shared quest
 * or event link.
 *
 * These used to sit under `(app)`, whose layout calls `requireRole`, so a link
 * sent to a friend bounced to /login and every share preview in WhatsApp and
 * Discord unfurled as "Sign in — Mythical Mecca" no matter which quest it
 * pointed at. They can't simply move to `(public)` either: `/quests/[slug]` is
 * a focus route that expects the app's backdrop and no nav, and the public
 * layout deliberately ships neither.
 *
 * So the chrome stays identical to `(app)` for anyone signed in, and signed-out
 * visitors get the public header instead of a redirect. The gate doesn't
 * disappear — it moves into the pages, which show a teaser and ask for a sign
 * in before revealing anything a member earns.
 */
export default async function OpenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <AppBackdrop />
        <div className="flex min-h-full flex-col">
          <a href="#main-content" className="mm-skip">
            Skip to content
          </a>
          <PublicTopNav />
          {/* No breadcrumbs: every crumb above a shared link is a members-only
              route, so the trail would be a row of redirects to /login. */}
          <main id="main-content" tabIndex={-1} className="flex-1">
            {children}
          </main>
        </div>
      </>
    );
  }

  const hasPartner = (await countMyPartnerships(session.user.id)) > 0;
  return (
    <>
      <AppBackdrop />
      <AppShell
        nav={<AppTopNav role={session.user.role} hasPartner={hasPartner} />}
      >
        {children}
      </AppShell>
    </>
  );
}
