import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PublicTopNav } from "@/components/public-top-nav";
import { SiteNav } from "@/components/site-nav";

/**
 * The header for a publicly readable page, chosen by who is reading it.
 *
 * `noDataMode` short-circuits everything. A no-data event's pages show no site
 * chrome at all — not the nav, not the breadcrumbs, not the sign-in button —
 * because each of those is an invitation into an account system the event has
 * deliberately opted out of. What's left is the event and the way into its
 * quest.
 *
 * Otherwise visitors get the public nav, and stallholders / keepers get the
 * staff one — except on `focus` routes (a quest being walked, a tag just
 * scanned), where a signed-in reader gets no chrome because the page already
 * carries its own way back.
 */
export async function OpenChrome({
  noDataMode,
  variant = "page",
}: {
  noDataMode: boolean;
  variant?: "page" | "focus";
}) {
  if (noDataMode) return null;

  if (variant === "focus") {
    const session = await auth();
    if (session?.user) return null;
    return <PublicTopNav />;
  }

  return (
    <>
      <SiteNav />
      <div className="mx-auto w-full max-w-6xl px-6 pt-6 empty:hidden">
        <Breadcrumbs />
      </div>
    </>
  );
}
