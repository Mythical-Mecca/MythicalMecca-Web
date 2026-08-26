import { requireRole } from "@/lib/guard";
import { ACCENT } from "@/lib/accents";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/partner-hub", label: "Overview", sub: "Dashboard", icon: "mdi:view-dashboard-outline", color: ACCENT.dashboard },
  { href: "/partner-hub/gallery", label: "Gallery", sub: "Your images", icon: "mdi:image-multiple-outline", color: ACCENT.gallery },
  { href: "/partner-hub/profile", label: "Shop", sub: "Business profile", icon: "game-icons:shop", color: ACCENT.marketplace },
];

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("partner");
  return (
    <DashboardShell area="Partner Hub" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
