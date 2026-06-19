import { requireRole } from "@/lib/guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { FactoryScene } from "@/components/factory-scene";
import { AuroraField } from "@/components/aurora-field";
import { ParticleField } from "@/components/particle-field";

const NAV: NavItem[] = [
  { href: "/command", label: "Overview", sub: "Dashboard", icon: "mdi:view-dashboard-outline", color: "#4aa8ff" },
  { href: "/command/posts", label: "News", sub: "Tidings — posts", icon: "game-icons:scroll-unfurled", color: "#E18D01" },
  { href: "/command/events", label: "Events", sub: "Gatherings & schedule", icon: "game-icons:campfire", color: "#5cc08c" },
  { href: "/command/gallery", label: "Gallery", sub: "Homepage photos", icon: "mdi:image-multiple", color: "#e0b0ff" },
  { href: "/command/applications", label: "Petitions", sub: "Vendor applications", icon: "mdi:file-document-outline", color: "#9a6cff" },
  { href: "/command/telemetry", label: "Chronicle", sub: "Logs / activity", icon: "game-icons:book-cover", color: "#48c8d6" },
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
