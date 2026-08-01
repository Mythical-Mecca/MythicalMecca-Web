import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { playerPass, passSecondsRemaining } from "@/lib/qr";
import { qrDataUrl } from "@/lib/qrcode";

/**
 * The adventurer's rotating check-in pass, for vendors who scan rather than
 * display. Short-lived by design: a screenshot forwarded across the venue is
 * dead within a couple of minutes.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const pass = playerPass(session.user.id);
  return NextResponse.json(
    {
      qr: await qrDataUrl(pass),
      secondsRemaining: passSecondsRemaining(),
      name: session.user.name ?? "Adventurer",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
