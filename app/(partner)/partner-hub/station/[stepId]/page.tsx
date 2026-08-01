import Link from "next/link";
import { notFound } from "next/navigation";
import { authorizeStation } from "@/lib/station-access";
import { recentStationCheckIns, stationCheckInCount } from "@/lib/hunts";
import { StationDisplay } from "@/components/station-display";
import { Icon } from "@/components/icon";

export const metadata = { title: "Station — Mythical Mecca" };

export default async function StationPage({
  params,
}: {
  params: Promise<{ stepId: string }>;
}) {
  const { stepId } = await params;
  const ctx = await authorizeStation(stepId);
  if (!ctx) notFound();

  const [recent, total] = await Promise.all([
    recentStationCheckIns(ctx.stepId),
    stationCheckInCount(ctx.stepId),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/partner-hub"
        className="inline-flex items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        <Icon icon="mdi:chevron-left" width={16} /> Partner hub
      </Link>
      <StationDisplay
        stepId={ctx.stepId}
        objectiveTitle={ctx.objectiveTitle}
        questTitle={ctx.questTitle}
        partnerName={ctx.partnerName}
        initialRecent={recent.map((r) => ({
          name: r.name,
          at: r.at.toISOString(),
        }))}
        initialTotal={total}
      />
    </div>
  );
}
