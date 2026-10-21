import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { listMyPartners } from "@/lib/partner-access";
import { roleAtLeast } from "@/lib/rbac";
import { PARTNER_STATUS } from "@/components/partner-status-badge";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { ACCENT } from "@/lib/accents";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * The authoritative gate. Membership is checked against the database rather
   * than the JWT role, so an invited teammate reaches the hub on their first
   * click instead of after a sign-out/sign-in cycle (see lib/partner-access.ts).
   */
  const session = await requireRole("member");
  const memberships = await listMyPartners(session.user.id);
  if (memberships.length === 0 && !roleAtLeast(session.user.role, "admin")) {
    redirect("/apply");
  }

  /**
   * Stall-independent: this layout sits above [partnerId] and so never receives
   * it. Each stall is listed explicitly instead, which is the more useful nav
   * anyway now that a user can run several.
   */
  const nav: NavItem[] = [
    {
      href: "/partner-hub",
      label: "Your stalls",
      sub: memberships.length === 1 ? "1 stall" : `${memberships.length} stalls`,
      icon: "mdi:view-dashboard-outline",
      color: ACCENT.dashboard,
    },
    ...(memberships.length > 0
      ? [
          {
            href: `/partner-hub/${memberships[0].partnerId}/events`,
            label: "Event Application",
            sub: "Calendar gatherings",
            icon: "mdi:calendar-plus",
            color: "#E18D01",
          },
        ]
      : []),
    ...memberships.map((m) => ({
      href: `/partner-hub/${m.partnerId}`,
      label: m.businessName,
      sub: PARTNER_STATUS[m.status].label,
      icon: "game-icons:shop",
      color: PARTNER_STATUS[m.status].color,
    })),
    {
      href: "/partner-hub/new",
      label: "New stall",
      sub: "Add another page",
      icon: "mdi:plus-circle-outline",
      color: ACCENT.marketplace,
    },
  ];

  return (
    <DashboardShell area="Partner Hub" nav={nav}>
      {children}
    </DashboardShell>
  );
}
