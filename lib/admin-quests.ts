import "server-only";
import { db } from "@/lib/db";
import {
  scavengerHunts,
  huntSteps,
  huntProgress,
  huntStations,
  huntClaimAttempts,
  events,
  partners,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
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
  eventId: string | null;
  eventTitle: string | null;
  eventSlug: string | null;
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
  claimMode: ClaimMode;
  claimRadiusM: number | null;
  locationHint: string | null;
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
  mode: string;
  objectiveList: AdminObjective[];
  /** Whether the attached event has coordinates — open-tag geofencing needs them. */
  eventHasCoords: boolean;
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
      .leftJoin(events, eq(scavengerHunts.eventId, events.id))
      .orderBy(desc(scavengerHunts.createdAt));
    return rows.map((r) => ({
      id: r.h.id,
      slug: r.h.slug,
      title: r.h.title,
      active: r.h.active,
      startsAt: r.h.startsAt,
      endsAt: r.h.endsAt,
      eventId: r.h.eventId,
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
        eventLat: events.lat,
        eventLng: events.lng,
      })
      .from(scavengerHunts)
      .leftJoin(events, eq(scavengerHunts.eventId, events.id))
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
      claimMode: r.s.claimMode,
      claimRadiusM: r.s.claimRadiusM,
      locationHint: r.s.locationHint,
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
      mode: row.h.mode,
      active: row.h.active,
      startsAt: row.h.startsAt,
      endsAt: row.h.endsAt,
      eventId: row.h.eventId,
      eventTitle: row.eventTitle,
      eventSlug: row.eventSlug,
      eventHasCoords: row.eventLat != null && row.eventLng != null,
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
  ip: string | null;
  createdAt: Date;
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
        ip: huntClaimAttempts.ip,
        createdAt: huntClaimAttempts.createdAt,
      })
      .from(huntClaimAttempts)
      .innerJoin(huntSteps, eq(huntClaimAttempts.stepId, huntSteps.id))
      .where(eq(huntSteps.huntId, huntId))
      .orderBy(desc(huntClaimAttempts.createdAt))
      .limit(limit);
    return rows;
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
