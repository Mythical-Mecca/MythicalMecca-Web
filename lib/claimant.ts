import "server-only";
import { auth } from "@/lib/auth";
import { playerForEvent } from "@/lib/event-player";

/**
 * Who is clearing an objective — a member of the site, or a player who exists
 * only inside one no-data event.
 *
 * A union rather than two optional ids because every query that touches
 * progress keys on exactly one of them, and "both null" or "both set" are
 * states the database rejects outright (see hunt_progress's check
 * constraint). The union makes them unrepresentable in the code too.
 *
 * Lives in its own module so that `lib/qr.ts` (which mints player passes) and
 * `lib/hunts.ts` (which reads them) can both name the type without importing
 * each other.
 */
export type Claimant =
  | { kind: "member"; userId: string }
  | { kind: "player"; playerId: string };

export const asMember = (userId: string): Claimant => ({
  kind: "member",
  userId,
});

export const asPlayer = (playerId: string): Claimant => ({
  kind: "player",
  playerId,
});

/** The id, whichever kind it is — for logging and activity trails. */
export const claimantId = (who: Claimant): string =>
  who.kind === "member" ? who.userId : who.playerId;

/**
 * The single place that decides who is playing.
 *
 * The event picks which kind of adventurer exists at it, so this asks only the
 * relevant question: at a no-data event, the member session is not consulted
 * at all, and everywhere else the player cookie isn't. That keeps the two
 * worlds from ever partially overlapping — you are one or the other here, and
 * never quietly both.
 *
 * Returns null when nobody applicable is signed in; callers decide whether
 * that means a sign-in panel or a redirect.
 */
export async function claimantFor(
  eventId: string,
  noDataMode: boolean
): Promise<Claimant | null> {
  if (noDataMode) {
    const player = await playerForEvent(eventId);
    return player ? asPlayer(player.playerId) : null;
  }
  const session = await auth();
  return session?.user ? asMember(session.user.id) : null;
}
