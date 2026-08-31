import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyTagToken } from "@/lib/qr";
import { claimantFor } from "@/lib/claimant";
import { forClaimant, getClaimTarget } from "@/lib/hunts";
import { QuestClaim } from "@/components/quest-claim";
import { PlayerSignIn } from "@/components/player-sign-in";
import { Icon } from "@/components/icon";

export const metadata = { title: "Check in" };

/**
 * Where every printed QR code and NFC tag lands.
 *
 * The token in the URL only names an objective — it grants nothing on its own,
 * which is why the same tag can be reprinted never and still work after an
 * admin switches the objective's claim mode mid-event.
 */
export default async function TagLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const [{ token }, { c }] = await Promise.all([params, searchParams]);

  const stepId = verifyTagToken(token);
  // Resolved before anyone is identified: the objective's event is what says
  // which kind of sign-in counts at this tag.
  const base = stepId ? await getClaimTarget(stepId) : null;
  const who = base ? await claimantFor(base.eventId, base.noDataMode) : null;
  const target = base && who ? await forClaimant(base, who) : base;

  if (!target) {
    return (
      // Top-aligned on phones so the check-in button sits well above the fold —
    // vertical centring looked tidy but pushed the only thing that matters
    // down the screen. Centred from tablet up, where there's room to spare.
    <div className="mx-auto max-w-md px-6 py-6 sm:flex sm:min-h-[60vh] sm:items-center">
        <div className="mm-glass w-full p-8 text-center">
          <Icon
            icon="game-icons:broken-shield"
            width={40}
            className="mx-auto text-[var(--mm-danger)]"
          />
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-xl">
            Unknown tag
          </h1>
          <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
            This tag isn&apos;t one of ours, or the objective it pointed at has
            been removed.
          </p>
          <Link href="/quests" className="mm-btn mm-btn-ghost mt-6">
            Quest board
          </Link>
        </div>
      </div>
    );
  }

  // Everywhere but a no-data event, a check-in needs a member — this is the
  // redirect the proxy used to perform, moved here now that /q has to stay
  // reachable for players who have no member session to check.
  if (!who && !target.noDataMode) redirect(`/login?from=/q/${token}`);

  // A scanned tag at a no-data event is most people's first contact with it,
  // so the panel that answers it is the one that gets them playing — not a
  // sign-in screen for a site this event has nothing to do with.
  if (!who && target.noDataMode) {
    return (
      <div className="mx-auto max-w-md px-6 py-6">
        <p className="text-center text-xs uppercase tracking-widest text-[var(--mm-gold)]">
          {target.huntTitle}
        </p>
        <PlayerSignIn
          eventId={target.eventId}
          eventTitle={target.huntTitle}
          path={`/q/${token}`}
        />
      </div>
    );
  }

  return (
    // Top-aligned on phones so the check-in button sits well above the fold —
    // vertical centring looked tidy but pushed the only thing that matters
    // down the screen. Centred from tablet up, where there's room to spare.
    <div className="mx-auto max-w-md px-6 py-6 sm:flex sm:min-h-[60vh] sm:items-center">
      <div className="w-full">
        <QuestClaim
          token={token}
          claimMode={target.claimMode}
          prefillCode={/^\d{4}$/.test(c ?? "") ? c! : ""}
          questSlug={target.huntSlug}
          questTitle={target.huntTitle}
          questOpen={target.huntOpen}
          objectiveTitle={target.title}
          destinationName={target.partnerName}
          locationHint={target.locationHint}
          points={target.points}
          alreadyDone={target.alreadyDone}
          lockedBy={target.lockedBy}
        />
      </div>
    </div>
  );
}
