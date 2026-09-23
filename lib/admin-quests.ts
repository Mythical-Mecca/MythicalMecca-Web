import "server-only";
import { db } from "@/lib/db";
import {
  scavengerHunts,
  huntSteps,
  huntProgress,
  huntStations,
  huntClaimAttempts,
  events,
  eventPlayers,
  playerSignups,
  partners,
  users,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { tagUrl, MissingSigningSecretError } from "@/lib/qr";
import type {
  ClaimMode,
  ClaimOutcome,
  RevealMode,
  StepType,
} from "@/lib/hunts";

const useDb = !!process.env.DATABASE_URL;

export interface AdminQuestRow {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  /** The attached event's id — what the table's Event cell edits. */
  eventId: string;
  eventTitle: string;
  eventSlug: string | null;
  /** True when the trail must be walked in order — see scavengerHunts. */
  sequential: boolean;
  objectives: number;
  players: number;
}

export interface AdminObjective {
  id: string;
  sort: number;
  type: StepType;
  title: string;
  prompt: string;
  points: number;
  revealMode: RevealMode;
  /** Off the quest page until the adventurer unlocks it. */
  hidden: boolean;
  claimMode: ClaimMode;
  claimRadiusM: number | null;
  locationHint: string | null;
  /** Prerequisite objective, honoured only on free-order quests. */
  parentId: string | null;
  partnerId: string | null;
  partnerName: string | null;
  /** Answers and choices. Admin-only — never hand this to a player's page. */
  config: Record<string, unknown>;
  /** What to print on the QR or write to the NFC tag. */
  tagUrl: string;
  completions: number;
  /** Null until a vendor has opened the station page for this objective. */
  stationLastSeenAt: Date | null;
  rotationSeconds: number | null;
}

export interface AdminQuestDetail extends AdminQuestRow {
  description: string;
  /** Freeform Easy-mode HTML — see scavengerHunts.easyModeHtml. */
  easyModeHtml: string;
  mode: string;
  objectiveList: AdminObjective[];
  /** Whether the attached event has coordinates — open-tag geofencing needs them. */
  eventHasCoords: boolean;
  /** See scavengerHunts.allowList. */
  allowListEnabled: boolean;
  allowList: string[];
  /** See scavengerHunts.prizeTiers. */
  prizeTiers: { points: number; entries: number }[];
  /**
   * Which kind of identity the list is written in. Follows the event, so the
   * editor asks for emails at an ordinary event and handles at a no-data one
   * rather than making the admin remember which applies.
   */
  eventNoDataMode: boolean;
  /**
   * The event's external sign-up step, when it has one — see events.signupUrl.
   * Read here so the editor can say the step is on and mark the roster; it is
   * configured on the event page.
   */
  eventSignup: { url: string; label: string | null } | null;
}

export async function listQuestsAdmin(): Promise<AdminQuestRow[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        h: scavengerHunts,
        eventTitle: events.title,
        eventSlug: events.slug,
        objectives: sql<number>`(select count(*) from ${huntSteps} where ${huntSteps.huntId} = ${scavengerHunts.id})`,
        players: sql<number>`(select count(distinct ${huntProgress.userId}) from ${huntProgress} where ${huntProgress.huntId} = ${scavengerHunts.id})`,
      })
      .from(scavengerHunts)
      .innerJoin(events, eq(scavengerHunts.eventId, events.id))
      .orderBy(desc(scavengerHunts.createdAt));
    return rows.map((r) => ({
      id: r.h.id,
      slug: r.h.slug,
      title: r.h.title,
      active: r.h.active,
      startsAt: r.h.startsAt,
      endsAt: r.h.endsAt,
      eventId: r.h.eventId,
      sequential: r.h.sequential,
      eventTitle: r.eventTitle,
      eventSlug: r.eventSlug,
      objectives: Number(r.objectives ?? 0),
      players: Number(r.players ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getQuestAdmin(
  slug: string
): Promise<AdminQuestDetail | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({
        h: scavengerHunts,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventNoDataMode: events.noDataMode,
        eventLat: events.lat,
        eventLng: events.lng,
        eventSignupUrl: events.signupUrl,
        eventSignupLabel: events.signupLabel,
      })
      .from(scavengerHunts)
      .innerJoin(events, eq(scavengerHunts.eventId, events.id))
      .where(eq(scavengerHunts.slug, slug))
      .limit(1);
    if (!row) return null;

    const steps = await db
      .select({
        s: huntSteps,
        partnerName: partners.businessName,
        stationLastSeenAt: huntStations.lastSeenAt,
        rotationSeconds: huntStations.rotationSeconds,
        completions: sql<number>`(select count(*) from ${huntProgress} where ${huntProgress.stepId} = ${huntSteps.id})`,
      })
      .from(huntSteps)
      .leftJoin(partners, eq(huntSteps.partnerId, partners.id))
      .leftJoin(huntStations, eq(huntStations.stepId, huntSteps.id))
      .where(eq(huntSteps.huntId, row.h.id))
      .orderBy(asc(huntSteps.sort));

    const objectiveList: AdminObjective[] = steps.map((r) => ({
      id: r.s.id,
      sort: r.s.sort,
      type: r.s.type,
      title: r.s.title,
      prompt: r.s.prompt ?? "",
      points: r.s.points,
      revealMode: r.s.revealMode,
      hidden: r.s.hidden,
      claimMode: r.s.claimMode,
      claimRadiusM: r.s.claimRadiusM,
      locationHint: r.s.locationHint,
      parentId: r.s.parentId,
      partnerId: r.s.partnerId,
      partnerName: r.partnerName,
      config: (r.s.config as Record<string, unknown>) ?? {},
      tagUrl: tagUrl(r.s.id),
      completions: Number(r.completions ?? 0),
      stationLastSeenAt: r.stationLastSeenAt,
      rotationSeconds: r.rotationSeconds,
    }));

    const players = await db
      .select({
        n: sql<number>`count(distinct ${huntProgress.userId})`,
      })
      .from(huntProgress)
      .where(eq(huntProgress.huntId, row.h.id));

    return {
      id: row.h.id,
      slug: row.h.slug,
      title: row.h.title,
      description: row.h.description ?? "",
      easyModeHtml: row.h.easyModeHtml ?? "",
      mode: row.h.mode,
      active: row.h.active,
      startsAt: row.h.startsAt,
      endsAt: row.h.endsAt,
      eventId: row.h.eventId,
      sequential: row.h.sequential,
      eventTitle: row.eventTitle,
      eventSlug: row.eventSlug,
      eventHasCoords: row.eventLat != null && row.eventLng != null,
      allowListEnabled: row.h.allowListEnabled,
      allowList: row.h.allowList ?? [],
      prizeTiers: row.h.prizeTiers ?? [],
      eventNoDataMode: row.eventNoDataMode,
      eventSignup: row.eventSignupUrl
        ? { url: row.eventSignupUrl, label: row.eventSignupLabel }
        : null,
      objectives: objectiveList.length,
      players: Number(players[0]?.n ?? 0),
      objectiveList,
    };
  } catch (e) {
    // A missing signing secret is a deployment fault, not a missing quest.
    // Swallowing it here renders a 404, which sends you looking for a deleted
    // record instead of an unset environment variable.
    if (e instanceof MissingSigningSecretError) throw e;
    return null;
  }
}

export interface ClaimAttemptRow {
  objectiveTitle: string | null;
  outcome: ClaimOutcome;
  claimMode: ClaimMode | null;
  /** Display name of whoever tried — a member, a no-data handle, or nobody. */
  playerName: string | null;
  ip: string | null;
  createdAt: Date;
}

/**
 * Where a player stands with the external sign-up form.
 *
 * - `confirmed`: the form's webhook named this handle.
 * - `claimed`: they ticked "I've done this" and nothing has confirmed it.
 * - `none`: neither.
 */
export type SignupState = "confirmed" | "claimed" | "none";

export interface QuestParticipant {
  id: string;
  name: string;
  completedStepIds: string[];
  points: number;
  lastAt: Date;
  /** Null for a member — the sign-up step only exists for event players. */
  signup: { state: SignupState; externalId: string | null } | null;
}

/**
 * Who is on this quest, and how far each of them has got.
 *
 * One row per adventurer, built from `hunt_progress` rather than the public
 * leaderboard. The board caps at twenty and only cares about points; this
 * list is the whole field, with every objective they have cleared, so an
 * organiser can see who is stuck, who has finished, and who found a hidden
 * extra.
 */
export async function questRoster(
  huntId: string
): Promise<QuestParticipant[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        userId: huntProgress.userId,
        playerId: huntProgress.playerId,
        userName: users.name,
        handle: eventPlayers.handle,
        acknowledgedAt: eventPlayers.signupAcknowledgedAt,
        confirmedAt: playerSignups.receivedAt,
        externalId: playerSignups.externalId,
        stepId: huntProgress.stepId,
        points: huntProgress.pointsAwarded,
        completedAt: huntProgress.completedAt,
      })
      .from(huntProgress)
      .leftJoin(users, eq(users.id, huntProgress.userId))
      .leftJoin(eventPlayers, eq(eventPlayers.id, huntProgress.playerId))
      // Sign-ups are matched by handle at read time — see playerSignups.
      .leftJoin(
        playerSignups,
        and(
          eq(playerSignups.eventId, eventPlayers.eventId),
          sql`lower(${playerSignups.handle}) = lower(${eventPlayers.handle})`
        )
      )
      .where(eq(huntProgress.huntId, huntId))
      .orderBy(asc(huntProgress.completedAt));

    const byId = new Map<string, QuestParticipant>();
    for (const r of rows) {
      const id = r.userId ?? r.playerId;
      if (!id) continue;
      const seen = byId.get(id);
      if (!seen) {
        byId.set(id, {
          id,
          name: r.userName ?? r.handle ?? "Adventurer",
          completedStepIds: [r.stepId],
          points: r.points,
          lastAt: r.completedAt,
          signup: r.playerId
            ? {
                state: r.confirmedAt
                  ? "confirmed"
                  : r.acknowledgedAt
                    ? "claimed"
                    : "none",
                externalId: r.externalId,
              }
            : null,
        });
        continue;
      }
      seen.completedStepIds.push(r.stepId);
      seen.points += r.points;
      if (r.completedAt > seen.lastAt) seen.lastAt = r.completedAt;
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

export interface UnmatchedSignup {
  handle: string;
  externalId: string | null;
  receivedAt: Date;
}

/**
 * Sign-ups the form reported for handles nobody at the event has taken.
 *
 * Usually a typo on the form — "Grognak" typed as "Grognack" — and the one
 * case the matching can't fix on its own. Listed so the organiser can spot
 * it while the player is still in the hall.
 */
export async function unmatchedSignups(
  eventId: string
): Promise<UnmatchedSignup[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        handle: playerSignups.handle,
        externalId: playerSignups.externalId,
        receivedAt: playerSignups.receivedAt,
      })
      .from(playerSignups)
      .leftJoin(
        eventPlayers,
        and(
          eq(eventPlayers.eventId, playerSignups.eventId),
          sql`lower(${eventPlayers.handle}) = lower(${playerSignups.handle})`
        )
      )
      .where(and(eq(playerSignups.eventId, eventId), isNull(eventPlayers.id)))
      .orderBy(desc(playerSignups.receivedAt))
      .limit(50);
    return rows;
  } catch {
    return [];
  }
}

/**
 * Recent claim traffic for one quest. This is the sharing detector: `open_tag`
 * objectives can't prevent a passed-around link, but a burst of successful
 * claims on one objective from one address is visible here.
 */
export async function questClaimFeed(
  huntId: string,
  limit = 40
): Promise<ClaimAttemptRow[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        objectiveTitle: huntSteps.title,
        outcome: huntClaimAttempts.outcome,
        claimMode: huntClaimAttempts.claimMode,
        userName: users.name,
        handle: eventPlayers.handle,
        ip: huntClaimAttempts.ip,
        createdAt: huntClaimAttempts.createdAt,
      })
      .from(huntClaimAttempts)
      .innerJoin(huntSteps, eq(huntClaimAttempts.stepId, huntSteps.id))
      .leftJoin(users, eq(users.id, huntClaimAttempts.userId))
      .leftJoin(eventPlayers, eq(eventPlayers.id, huntClaimAttempts.playerId))
      .where(eq(huntSteps.huntId, huntId))
      .orderBy(desc(huntClaimAttempts.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      objectiveTitle: r.objectiveTitle,
      outcome: r.outcome,
      claimMode: r.claimMode,
      playerName: r.userName ?? r.handle,
      ip: r.ip,
      createdAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

export interface PaceFlag {
  playerName: string;
  /** Shortest gap, in seconds, between two of this player's check-ins. */
  fastestSeconds: number;
  /** How many of their check-ins landed faster than the threshold. */
  hops: number;
}

/**
 * Check-ins that came too close together to have been walked between.
 *
 * The other two flags key on the source address, which a group sharing one
 * hotspot trips innocently. This one is per person and measures the thing a
 * passed-on tag can't hide: clearing two stands eight seconds apart means the
 * adventurer never walked to the second one. It is the only check an `open`
 * objective gets, since nothing about the scan itself can be verified.
 *
 * Covers the whole quest rather than the last hour — "did anyone cheat?" is
 * usually asked once the event is over.
 */
export async function paceFlags(
  huntId: string,
  thresholdSeconds = 20
): Promise<PaceFlag[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        userId: huntProgress.userId,
        playerName: users.name,
        completedAt: huntProgress.completedAt,
      })
      .from(huntProgress)
      .innerJoin(users, eq(huntProgress.userId, users.id))
      .where(eq(huntProgress.huntId, huntId))
      .orderBy(asc(huntProgress.userId), asc(huntProgress.completedAt));

    // One row per objective per player, so consecutive rows for the same
    // player are always two different destinations.
    const byPlayer = new Map<string, PaceFlag>();
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]!;
      const row = rows[i]!;
      // `hunt_progress.user_id` is NOT NULL, but selecting it alongside a join
      // widens the inferred type to `string | null`. Skipping rather than
      // casting: a row with no player is not a pace signal either way, and the
      // map has to be keyed by a real id.
      if (!row.userId) continue;
      if (row.userId !== prev.userId) continue;
      const gap = Math.round(
        (row.completedAt.getTime() - prev.completedAt.getTime()) / 1000
      );
      if (gap > thresholdSeconds) continue;
      const seen = byPlayer.get(row.userId);
      byPlayer.set(row.userId, {
        playerName: row.playerName ?? "An adventurer",
        fastestSeconds: Math.min(seen?.fastestSeconds ?? gap, gap),
        hops: (seen?.hops ?? 0) + 1,
      });
    }
    return [...byPlayer.values()]
      .sort((a, b) => a.fastestSeconds - b.fastestSeconds)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export interface SharingFlag {
  objectiveTitle: string;
  ip: string;
  claims: number;
}

export interface GuessFlag {
  objectiveTitle: string;
  ip: string;
  attempts: number;
}

/**
 * Wrong-code bursts. Distinct from {@link sharingFlags}, which only counts
 * successes — a brute-force run is thousands of *failures* and would otherwise
 * be invisible here even as it hammered an objective. `tooManyBadAttempts`
 * blocks it; this is how anyone finds out it happened.
 */
export async function guessFlags(
  huntId: string,
  threshold = 15
): Promise<GuessFlag[]> {
  if (!useDb) return [];
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await db
      .select({
        objectiveTitle: huntSteps.title,
        ip: huntClaimAttempts.ip,
        attempts: sql<number>`count(*)`,
      })
      .from(huntClaimAttempts)
      .innerJoin(huntSteps, eq(huntClaimAttempts.stepId, huntSteps.id))
      .where(
        and(
          eq(huntSteps.huntId, huntId),
          inArray(huntClaimAttempts.outcome, ["bad_code", "rate_limited"]),
          gte(huntClaimAttempts.createdAt, since)
        )
      )
      .groupBy(huntSteps.title, huntClaimAttempts.ip)
      .having(sql`count(*) >= ${threshold}`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    return rows
      .filter((r) => r.ip)
      .map((r) => ({
        objectiveTitle: r.objectiveTitle,
        ip: r.ip!,
        attempts: Number(r.attempts),
      }));
  } catch {
    return [];
  }
}

/**
 * Successful claims on the same objective from the same address in the last
 * hour. Two is normal (a couple sharing a hotspot); a dozen is a passed link.
 */
export async function sharingFlags(
  huntId: string,
  threshold = 4
): Promise<SharingFlag[]> {
  if (!useDb) return [];
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await db
      .select({
        objectiveTitle: huntSteps.title,
        ip: huntClaimAttempts.ip,
        claims: sql<number>`count(*)`,
      })
      .from(huntClaimAttempts)
      .innerJoin(huntSteps, eq(huntClaimAttempts.stepId, huntSteps.id))
      .where(
        and(
          eq(huntSteps.huntId, huntId),
          eq(huntClaimAttempts.outcome, "ok"),
          gte(huntClaimAttempts.createdAt, since)
        )
      )
      .groupBy(huntSteps.title, huntClaimAttempts.ip)
      .having(sql`count(*) >= ${threshold}`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    return rows
      .filter((r) => r.ip)
      .map((r) => ({
        objectiveTitle: r.objectiveTitle,
        ip: r.ip!,
        claims: Number(r.claims),
      }));
  } catch {
    return [];
  }
}
