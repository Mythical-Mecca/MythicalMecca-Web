import { NextResponse } from "next/server";
import { authorizeStation } from "@/lib/station-access";
import {
  ensureStation,
  touchStation,
  recentStationCheckIns,
  stationCheckInCount,
} from "@/lib/hunts";
import { upcomingCodes, stationScanUrl } from "@/lib/qr";
import { qrDataUrl } from "@/lib/qrcode";

/**
 * Feeds the station display a short buffer of upcoming codes rather than one
 * code at a time. Three rotations of runway means a vendor's tablet dropping
 * off the venue wifi for a couple of minutes doesn't stall check-ins.
 *
 * The station key itself never leaves the server.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ stepId: string }> }
) {
  const { stepId } = await params;

  const ctx = await authorizeStation(stepId);
  if (!ctx) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const station = await ensureStation(stepId);
  if (!station) {
    return NextResponse.json({ error: "no_station" }, { status: 404 });
  }

  const codes = upcomingCodes(station.stationKey, station.rotationSeconds, 3);
  const withQr = await Promise.all(
    codes.map(async (c) => ({
      ...c,
      qr: await qrDataUrl(stationScanUrl(stepId, c.code)),
    }))
  );

  await touchStation(stepId);

  // Recent check-ins ride along on the poll the display is making anyway. A
  // vendor in the passive "show code" mode otherwise watches a list frozen at
  // whatever it was when they opened the page, with no sign the thing works.
  const [recent, total] = await Promise.all([
    recentStationCheckIns(stepId),
    stationCheckInCount(stepId),
  ]);

  return NextResponse.json(
    {
      rotationSeconds: station.rotationSeconds,
      serverNow: Date.now(),
      codes: withQr,
      recent,
      total,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
