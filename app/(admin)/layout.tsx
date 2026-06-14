import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/command", label: "Overview" },
  { href: "/command/posts", label: "Posts" },
  { href: "/command/events", label: "Events" },
  { href: "/command/applications", label: "Applications" },
  { href: "/command/telemetry", label: "Telemetry" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  return (
    <DashboardShell area="Command" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
