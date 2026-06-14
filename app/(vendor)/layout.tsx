import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/forge", label: "Overview" },
  { href: "/forge/gallery", label: "Gallery" },
  { href: "/forge/profile", label: "Manufacturer" },
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
