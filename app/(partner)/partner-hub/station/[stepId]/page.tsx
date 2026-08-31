import { notFound } from "next/navigation";
import { authorizeStation } from "@/lib/station-access";
import { recentStationCheckIns, stationCheckInCount } from "@/lib/hunts";
import { StationDisplay } from "@/components/station-display";
import { BackLink } from "@/components/back-link";
import { parseReturn } from "@/lib/return-to";

export const metadata = { title: "Station" };

export default async function StationPage({
  params,
  searchParams,
}: {
  params: Promise<{ stepId: string }>;
  searchParams: Promise<{ from?: string; fromLabel?: string }>;
}) {
  const { stepId } = await params;
  // A steward opens this from the hub; an admin opens it from the quest
  // editor or the tag sheet. Only the first belongs back at the hub.
  const backTo = parseReturn(await searchParams, {
    href: "/partner-hub",
    label: "Partner hub",
  });
  const ctx = await authorizeStation(stepId);
  if (!ctx) notFound();

  const [recent, total] = await Promise.all([
    recentStationCheckIns(ctx.stepId),
    stationCheckInCount(ctx.stepId),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <BackLink to={backTo} />
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
