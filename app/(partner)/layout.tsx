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
  const isPartnerOrAdmin =
    roleAtLeast(session.user.role, "partner") ||
    roleAtLeast(session.user.role, "admin");
  if (memberships.length === 0 && !isPartnerOrAdmin) {
    redirect("/apply");
  }

  /**
   * Stall-independent: this layout sits above [partnerId] and so never receives
   * it. Each stall is listed explicitly instead, which is the more useful nav
   * anyway now that a user can run several.
   */
  const nav: NavItem[] = [
    {
      href: "/partner-hub?tab=stalls",
      label: "Manage Stalls",
      sub: memberships.length === 1 ? "1 stall" : `${memberships.length} stalls`,
      icon: "game-icons:shop",
      color: "#4aa8ff",
    },
    {
      href: "/partner-hub?tab=events",
      label: "Event Management",
      sub: "Calendar gatherings",
      icon: "mdi:calendar-month-outline",
      color: "#E18D01",
    },
    {
      href: "/partner-hub/new",
      label: "New Stall",
      sub: "Add another shop",
      icon: "mdi:plus-circle-outline",
      color: ACCENT.marketplace,
    },
    ...memberships.map((m) => ({
      href: `/partner-hub/${m.partnerId}`,
      label: m.businessName,
      sub: PARTNER_STATUS[m.status].label,
      icon: "game-icons:shop",
      color: PARTNER_STATUS[m.status].color,
    })),
  ];

  return (
    <DashboardShell area="Partner Hub" nav={nav}>
      {children}
    </DashboardShell>
  );
}
