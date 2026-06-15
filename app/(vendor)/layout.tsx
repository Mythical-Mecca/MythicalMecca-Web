import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/forge", label: "Overview", icon: "mdi:view-dashboard-outline" },
  { href: "/forge/gallery", label: "Gallery", icon: "mdi:image-multiple-outline" },
  { href: "/forge/profile", label: "Stall", icon: "game-icons:shop" },
];

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("vendor");
  return (
    <DashboardShell area="Forge" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
