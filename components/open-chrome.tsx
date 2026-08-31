import { auth } from "@/lib/auth";
import { countMyPartnerships } from "@/lib/partner-access";
import { AppTopNav } from "@/components/app-top-nav";
import { PublicTopNav } from "@/components/public-top-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";

/**
 * The header for a publicly readable page, chosen by who is reading it.
 *
 * `noDataMode` short-circuits everything. A no-data event's pages show no site
 * chrome at all — not the nav, not the breadcrumbs, not the sign-in button —
 * because each of those is an invitation into an account system the event has
 * deliberately opted out of. What's left is the event and the way into its
 * quest.
 *
 * Otherwise: members get the app nav they have everywhere else, and everyone
 * else gets the public one, so a shared link still looks like part of the site
 * rather than a page floating on its own.
 */
export async function OpenChrome({
  noDataMode,
  variant = "page",
}: {
  noDataMode: boolean;
  /**
   * `focus` is a route that is a task rather than a place to browse from — a
   * quest being walked, a tag just scanned. It carries its own header and its
   * own way back, so a signed-in member gets no nav at all; a signed-out
   * reader still gets the public one, because for them this is the landing
   * page of a link somebody sent. Mirrors <AppShell>'s focus routes.
   */
  variant?: "page" | "focus";
}) {
  if (noDataMode) return null;

  const session = await auth();
  if (!session?.user) return <PublicTopNav />;
  if (variant === "focus") return null;

  // Counted from partner_members rather than read off the JWT role, which goes
  // stale until the next sign-in — see the note in <AppTopNav>.
  const hasPartner = (await countMyPartnerships(session.user.id)) > 0;
  return (
    <>
      <AppTopNav role={session.user.role} hasPartner={hasPartner} />
      {/* Two nav layers, not four. The header carries the sections; this
          carries where you are inside one. */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-6 empty:hidden">
        <Breadcrumbs />
      </div>
    </>
  );
}
