import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/command", label: "Overview" },
  { href: "/command/posts", label: "Tidings" },
  { href: "/command/events", label: "Gatherings" },
  { href: "/command/applications", label: "Petitions" },
  { href: "/command/telemetry", label: "Chronicle" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  return (
    <DashboardShell area="The Keep" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
