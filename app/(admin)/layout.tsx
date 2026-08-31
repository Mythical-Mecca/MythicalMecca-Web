import { requireRole } from "@/lib/guard";
import { ACCENT } from "@/lib/accents";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { FactoryScene } from "@/components/animations/factory-scene";
import { AuroraField } from "@/components/animations/aurora-field";
import { ParticleField } from "@/components/animations/particle-field";

// Posts (news), groups and lists are parked for launch alongside their member
// -facing sections — the pages live on in `app/(admin)/admin/_*`.
const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", sub: "Dashboard", icon: "mdi:view-dashboard-outline", color: ACCENT.dashboard },
  { href: "/admin/events", label: "Events", sub: "Schedule & moderation", icon: "game-icons:campfire", color: ACCENT.events },
  { href: "/admin/gallery", label: "Gallery", sub: "Homepage photos", icon: "mdi:image-multiple", color: ACCENT.gallery },
  { href: "/admin/partners", label: "Partners", sub: "Partners & applications", icon: "game-icons:anvil", color: ACCENT.partners },
  { href: "/admin/quests", label: "Quests", sub: "Venue trails & tags", icon: "game-icons:treasure-map", color: ACCENT.quests },
  { href: "/admin/reviews", label: "Reviews", sub: "Approve testimonials", icon: "mdi:star-outline", color: ACCENT.reviews },
  { href: "/admin/users", label: "Members", sub: "Roles, admin & bans", icon: "mdi:account-group-outline", color: ACCENT.admin },
  { href: "/admin/telemetry", label: "Logs", sub: "Activity & errors", icon: "game-icons:book-cover", color: ACCENT.logs },
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
          <AuroraField fps={20} maxDpr={1} />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <ParticleField fps={20} maxDpr={1} maxPoints={30} />
        </div>
      </div>

      <DashboardShell area="Admin" nav={NAV}>
        {children}
      </DashboardShell>
    </>
  );
}
