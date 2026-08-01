import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/partner-hub", label: "Overview", sub: "Dashboard", icon: "mdi:view-dashboard-outline", color: "#4aa8ff" },
  { href: "/partner-hub/gallery", label: "Gallery", sub: "Your images", icon: "mdi:image-multiple-outline", color: "#E18D01" },
  { href: "/partner-hub/profile", label: "Shop", sub: "Business profile", icon: "game-icons:shop", color: "#5cc08c" },
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
