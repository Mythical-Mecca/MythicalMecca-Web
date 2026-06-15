import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/forge", label: "Overview", sub: "Dashboard", icon: "mdi:view-dashboard-outline", color: "#4aa8ff" },
  { href: "/forge/gallery", label: "Gallery", sub: "Your images", icon: "mdi:image-multiple-outline", color: "#f2b441" },
  { href: "/forge/profile", label: "Stall", sub: "Shop profile", icon: "game-icons:shop", color: "#5cc08c" },
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
