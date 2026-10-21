import { auth } from "@/lib/auth";
import { countMyPartnerships } from "@/lib/partner-access";
import { roleAtLeast } from "@/lib/rbac";
import { AppTopNav } from "@/components/app-top-nav";
import { PublicTopNav } from "@/components/public-top-nav";

/**
 * Public chrome for visitors (and for a signed-in applicant), staff chrome
 * for keepers and stallholders. One decision, used by the public layout and
 * by publicly readable event/quest pages.
 */
export async function SiteNav() {
  const session = await auth();
  if (!session?.user) return <PublicTopNav />;

  const hasPartner = (await countMyPartnerships(session.user.id)) > 0;
  if (roleAtLeast(session.user.role, "admin") || hasPartner) {
    return <AppTopNav role={session.user.role} hasPartner={hasPartner} />;
  }

  return <PublicTopNav signedIn showApply={!hasPartner} hasPartner={hasPartner} />;
}
