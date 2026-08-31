import { NextResponse } from "next/server";
import { playerPass, passSecondsRemaining } from "@/lib/qr";
import { qrDataUrl } from "@/lib/qrcode";
import { claimantFor } from "@/lib/claimant";
import { claimantName, huntEventFor } from "@/lib/hunts";

/**
 * The adventurer's rotating check-in pass, for vendors who scan rather than
 * display. Short-lived by design: a screenshot forwarded across the venue is
 * dead within a couple of minutes.
 *
 * Takes the quest it is being shown on, because that is what decides which
 * sign-in counts: at a no-data event the pass belongs to an event player, and
 * everywhere else to a member. Minting from whichever session happened to
 * exist would let a member walk into a no-data event holding a valid-looking
 * pass that the stand would then have to reject at the counter.
 */
export async function GET(req: Request) {
  const quest = new URL(req.url).searchParams.get("quest");
  if (!quest) {
    return NextResponse.json({ error: "quest_required" }, { status: 400 });
  }

  const event = await huntEventFor(quest);
  if (!event) {
    return NextResponse.json({ error: "unknown_quest" }, { status: 404 });
  }

  const who = await claimantFor(event.id, event.noDataMode);
  if (!who) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json(
    {
      qr: await qrDataUrl(playerPass(who)),
      secondsRemaining: passSecondsRemaining(),
      name: await claimantName(who),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
