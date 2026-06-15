import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { FactoryScene } from "@/components/factory-scene";
import { AuroraField } from "@/components/aurora-field";
import { ParticleField } from "@/components/particle-field";

const NAV: NavItem[] = [
  { href: "/command", label: "Overview", icon: "mdi:view-dashboard-outline" },
  { href: "/command/posts", label: "Tidings", icon: "game-icons:scroll-unfurled" },
  { href: "/command/events", label: "Gatherings", icon: "game-icons:campfire" },
  { href: "/command/applications", label: "Petitions", icon: "mdi:file-document-outline" },
  { href: "/command/telemetry", label: "Chronicle", icon: "game-icons:book-cover" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  return (
    <>
      <div aria-hidden className="fixed inset-0 -z-10">
        <FactoryScene className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,11,22,0.74), rgba(8,11,22,0.88))",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <AuroraField />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <ParticleField />
        </div>
      </div>

      <DashboardShell area="The Keep" nav={NAV}>
        {children}
      </DashboardShell>
    </>
  );
}
