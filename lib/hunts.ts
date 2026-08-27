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
  partnerMembers,
  users,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { newStationKey, verifyStationCode } from "@/lib/qr";
import { isStoredMediaUrl } from "@/lib/media";

const useDb = !!process.env.DATABASE_URL;

export type StepType =
  | "qr_scan"
  | "riddle"
  | "crossword"
  | "cipher"
  | "geo_checkpoint"
  | "photo_proof"
  | "trivia_gate"
  | "unlock_code";

export type ClaimMode =
  | "live_code"
  | "sealed_tag"
  | "location_verified"
  | "open";
export type RevealMode = "direct" | "clue";
export type ClaimOutcome =
  | "ok"
  | "duplicate"
  | "bad_code"
  | "out_of_range"
  | "not_open"
  | "unknown_step"
  | "rate_limited"
  /** A prerequisite objective hasn't been cleared yet. */
  | "locked";

/**
 * `qr_scan` is the workhorse type for a venue quest: "get to the destination
 * and check in there". Everything else is answered in the app without moving.
 */
export const isVisitStep = (t: StepType) => t === "qr_scan";

export interface Destination {
  partnerSlug: string | null;
  partnerName: string | null;
  locationHint: string | null;
}

export interface PublicStep {
  id: string;
  type: StepType;
  title: string;
  prompt: string;
  points: number;
  choices?: string[]; // trivia only — never includes the answer
  done: boolean;
  revealMode: RevealMode;
  claimMode: ClaimMode;
  /**
   * Waiting on something else. `true` when the quest is sequential and an
   * earlier objective is outstanding, or when this one names a prerequisite
   * that hasn't been cleared.
   */
  locked: boolean;
  /** What it is waiting for, for the player-facing explanation. */
  lockedBy: string | null;
  /** Null until earned when `revealMode` is "clue" — the clue *is* the puzzle. */
  destination: Destination | null;
}

export interface HuntView {
  slug: string;
  /** True when the trail must be walked in order — drives the player copy. */
  sequential: boolean;
  title: string;
  description: string;
  mode: string;
  steps: PublicStep[];
  totalPoints: number;
  earnedPoints: number;
  /**
   * Null when the quest's event isn't public yet — the event exists (the FK is
   * NOT NULL) but a draft has no page to link to.
   */
  eventSlug: string | null;
  eventTitle: string;
  open: boolean;
}

export interface LeaderRow {
  userId: string;
  name: string;
  points: number;
  steps: number;
}

interface RawStep {
  id: string;
  sort: number;
  parentId: string | null;
  type: StepType;
  title: string;
  prompt: string;
  points: number;
  config: Record<string, unknown>;
  revealMode: RevealMode;
  claimMode: ClaimMode;
  claimRadiusM: number | null;
  partnerId: string | null;
  partnerSlug: string | null;
  partnerName: string | null;
  locationHint: string | null;
}
interface RawHunt {
  id: string;
  slug: string;
  sequential: boolean;
  title: string;
  description: string;
  mode: string;
  steps: RawStep[];
  /**
   * Null when the quest's event isn't public yet — the event exists (the FK is
   * NOT NULL) but a draft has no page to link to.
   */
  eventSlug: string | null;
  eventTitle: string;
  eventLat: number | null;
  eventLng: number | null;
  open: boolean;
}

/** A quest is claimable only while active *and* inside its scheduled window. */
function isOpen(h: {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  const now = Date.now();
  if (!h.active) return false;
  if (h.startsAt && h.startsAt.getTime() > now) return false;
  if (h.endsAt && h.endsAt.getTime() < now) return false;
  return true;
}

/** SQL form of {@link isOpen}, for list queries. */
const openPredicate = () => {
  const now = new Date();
  return and(
    eq(scavengerHunts.active, true),
    or(isNull(scavengerHunts.startsAt), gte(sql`${now}`, scavengerHunts.startsAt)),
    or(isNull(scavengerHunts.endsAt), gte(scavengerHunts.endsAt, sql`${now}`))
  );
};

async function stepsFor(huntId: string): Promise<RawStep[]> {
  const rows = await db
    .select({ s: huntSteps, partnerSlug: partners.slug, partnerName: partners.businessName })
    .from(huntSteps)
    .leftJoin(partners, eq(huntSteps.partnerId, partners.id))
    .where(eq(huntSteps.huntId, huntId))
    .orderBy(huntSteps.sort);
  return rows.map(({ s, partnerSlug, partnerName }) => ({
    id: s.id,
    sort: s.sort,
    parentId: s.parentId,
    type: s.type,
    title: s.title,
    prompt: s.prompt ?? "",
    points: s.points,
    config: (s.config as Record<string, unknown>) ?? {},
    revealMode: s.revealMode,
    claimMode: s.claimMode,
    claimRadiusM: s.claimRadiusM,
    partnerId: s.partnerId,
    partnerSlug,
    partnerName,
    locationHint: s.locationHint,
  }));
}

async function rawHunt(slug: string): Promise<RawHunt | null> {
  if (!useDb) return null;
  const [row] = await db
    .select({
      h: scavengerHunts,
      eventSlug: events.slug,
      eventTitle: events.title,
      eventLat: events.lat,
      eventLng: events.lng,
    })
    .from(scavengerHunts)
    .innerJoin(events, eq(scavengerHunts.eventId, events.id))
    .where(eq(scavengerHunts.slug, slug))
    .limit(1);
  if (!row) return null;
  return {
    id: row.h.id,
    slug: row.h.slug,
    sequential: row.h.sequential,
    title: row.h.title,
    description: row.h.description ?? "",
    mode: row.h.mode,
    eventSlug: row.eventSlug,
    eventTitle: row.eventTitle,
    eventLat: row.eventLat,
    eventLng: row.eventLng,
    open: isOpen(row.h),
    steps: await stepsFor(row.h.id),
  };
}

/**
 * Is this objective open to the player yet?
 *
 * Two models, chosen per quest:
 *
 * - `sequential` — the trail is a line. An objective opens once everything
 *   before it in `sort` order is cleared. Parent links are ignored, because a
 *   second ordering on top of a strict one can only contradict it.
 * - free — an objective opens immediately unless it names a `parentId`, in
 *   which case it waits for exactly that one. Everything unparented stays
 *   claimable in any order, which is the default and what the venue-navigation
 *   model was designed around.
 *
 * Returns the blocking objective's title, or null when nothing blocks it.
 */
function blockedBy(
  step: RawStep,
  all: RawStep[],
  doneIds: Set<string>,
  sequential: boolean
): string | null {
  if (sequential) {
    const earlier = all
      .filter((o) => o.sort < step.sort)
      .sort((a, b) => b.sort - a.sort);
    const blocking = earlier.find((o) => !doneIds.has(o.id));
    return blocking ? blocking.title : null;
  }
  if (!step.parentId) return null;
  if (doneIds.has(step.parentId)) return null;
  // A parent that has since been deleted leaves parentId null via the FK, so
  // an unresolvable id here means the row is mid-change; treat it as open
  // rather than stranding the player.
  return all.find((o) => o.id === step.parentId)?.title ?? null;
}

function publicStep(
  s: RawStep,
  done: boolean,
  lockedBy: string | null = null
): PublicStep {
  // A "clue" objective withholds *where* until it's been claimed — revealing
  // the vendor early would hand over the answer.
  const reveal = s.revealMode === "direct" || done;
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    prompt: s.prompt,
    points: s.points,
    choices:
      s.type === "trivia_gate"
        ? (s.config.choices as string[] | undefined)
        : undefined,
    done,
    revealMode: s.revealMode,
    claimMode: s.claimMode,
    locked: lockedBy !== null,
    lockedBy,
    destination: reveal
      ? {
          partnerSlug: s.partnerSlug,
          partnerName: s.partnerName,
          locationHint: s.locationHint,
        }
      : null,
  };
}

/** Open quests tied to an event, for the event detail page. */
export async function listHuntsForEvent(
  eventId: string
): Promise<{ slug: string; title: string; description: string; steps: number }[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        slug: scavengerHunts.slug,
        title: scavengerHunts.title,
        description: scavengerHunts.description,
        steps: sql<number>`(select count(*) from ${huntSteps} where ${huntSteps.huntId} = ${scavengerHunts.id})`,
      })
      .from(scavengerHunts)
      .where(and(eq(scavengerHunts.eventId, eventId), openPredicate()))
      .orderBy(scavengerHunts.createdAt);
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      steps: Number(r.steps ?? 0),
    }));
  } catch {
    return [];
  }
}

export interface HuntCard {
  slug: string;
  title: string;
  description: string;
  steps: number;
  /**
   * Null when the quest's event isn't public yet — the event exists (the FK is
   * NOT NULL) but a draft has no page to link to.
   */
  eventSlug: string | null;
  eventTitle: string;
  /** How many objectives this adventurer has cleared. 0 when signed out. */
  done: number;
}

/** Open quests, with the viewer's progress folded in for the board. */
export async function listHunts(userId?: string): Promise<HuntCard[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({
        id: scavengerHunts.id,
        slug: scavengerHunts.slug,
        title: scavengerHunts.title,
        description: scavengerHunts.description,
        eventSlug: events.slug,
        eventTitle: events.title,
        steps: sql<number>`(select count(*) from ${huntSteps} where ${huntSteps.huntId} = ${scavengerHunts.id})`,
        done: userId
          ? sql<number>`(select count(*) from ${huntProgress} where ${huntProgress.huntId} = ${scavengerHunts.id} and ${huntProgress.userId} = ${userId})`
          : sql<number>`0`,
      })
      .from(scavengerHunts)
      .innerJoin(events, eq(scavengerHunts.eventId, events.id))
      .where(openPredicate())
      .orderBy(desc(scavengerHunts.createdAt));
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      steps: Number(r.steps ?? 0),
      eventSlug: r.eventSlug,
      eventTitle: r.eventTitle,
      done: Number(r.done ?? 0),
    }));
  } catch {
    return [];
  }
}

async function completedStepIds(
  huntId: string,
  userId: string
): Promise<Set<string>> {
  if (!useDb) return new Set();
  try {
    const rows = await db
      .select({ stepId: huntProgress.stepId })
      .from(huntProgress)
      .where(and(eq(huntProgress.huntId, huntId), eq(huntProgress.userId, userId)));
    return new Set(rows.map((r) => r.stepId));
  } catch {
    return new Set();
  }
}

export async function getHunt(
  slug: string,
  userId?: string
): Promise<HuntView | null> {
  const raw = await rawHunt(slug);
  if (!raw) return null;
  const done = userId ? await completedStepIds(raw.id, userId) : new Set<string>();
  const steps = raw.steps.map((s) =>
    publicStep(s, done.has(s.id), blockedBy(s, raw.steps, done, raw.sequential))
  );
  return {
    slug: raw.slug,
    sequential: raw.sequential,
    title: raw.title,
    description: raw.description,
    mode: raw.mode,
    steps,
    totalPoints: raw.steps.reduce((a, s) => a + s.points, 0),
    earnedPoints: steps.filter((s) => s.done).reduce((a, s) => a + s.points, 0),
    eventSlug: raw.eventSlug,
    eventTitle: raw.eventTitle,
    open: raw.open,
  };
}

/**
 * Server-only: the full raw step (with answer config) for verification, plus
 * whether its quest is currently open. Callers must honour `huntOpen` — this
 * is the only guard stopping in-app objectives from being answered before a
 * quest starts or after the leaderboard has been read out.
 */
export async function getStepRaw(
  huntSlug: string,
  stepId: string,
  /** Resolves `lockedBy` for this player. Omit for callers that don't gate. */
  userId?: string
): Promise<{
  step: RawStep;
  huntId: string;
  huntOpen: boolean;
  lockedBy: string | null;
} | null> {
  const raw = await rawHunt(huntSlug);
  const step = raw?.steps.find((s) => s.id === stepId);
  if (!raw || !step) return null;
  // In-app objectives are claimed by POSTing an answer, which is as forgeable
  // as opening a tag URL — the ordering rule has to hold on this path too.
  const done = userId ? await completedStepIds(raw.id, userId) : new Set<string>();
  const lockedBy = userId
    ? blockedBy(step, raw.steps, done, raw.sequential)
    : null;
  return { step, huntId: raw.id, huntOpen: raw.open, lockedBy };
}

function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function verifyStep(
  step: RawStep,
  submitted: Record<string, unknown>
): boolean {
  switch (step.type) {
    case "riddle":
    case "crossword":
    case "cipher":
      return (
        norm(String(submitted.answer ?? "")) ===
        norm(String(step.config.answer ?? ""))
      );
    case "unlock_code":
      return (
        norm(String(submitted.code ?? "")) === norm(String(step.config.code ?? ""))
      );
    case "trivia_gate":
      return Number(submitted.choice) === Number(step.config.correct);
    case "geo_checkpoint": {
      const lat = Number(submitted.lat);
      const lng = Number(submitted.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
      return (
        haversine(
          { lat, lng },
          { lat: Number(step.config.lat), lng: Number(step.config.lng) }
        ) <= Number(step.config.radius_m)
      );
    }
    case "photo_proof":
      // The URL is supplied by the client, so "there is a string here" proves
      // nothing — it has to be a file in our own store. `auto_approve` means
      // "no admin review needed", NOT "no photo needed": it previously
      // short-circuited this check and awarded points for an empty submission.
      return isStoredMediaUrl(String(submitted.fileUrl ?? ""));
    case "qr_scan":
      // Destination objectives are never completed through this path — they go
      // through the claim route, which does its own proof-of-presence checks.
      return false;
    default:
      return false;
  }
}

/**
 * Idempotent. Returns false when nothing was written — either the row already
 * existed or the write failed. Callers must not report success on false.
 */
export async function recordCompletion(
  huntId: string,
  stepId: string,
  userId: string,
  points: number,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!useDb) return false;
  try {
    const inserted = await db
      .insert(huntProgress)
      .values({ huntId, stepId, userId, pointsAwarded: points, payload })
      .onConflictDoNothing()
      .returning({ id: huntProgress.id });
    return inserted.length > 0;
  } catch {
    return false;
  }
}

/** Resolve a hunt id from a slug — completions are keyed by id, not slug. */
export async function huntIdForSlug(slug: string): Promise<string | null> {
  if (!useDb) return null;
  try {
    const [h] = await db
      .select({ id: scavengerHunts.id })
      .from(scavengerHunts)
      .where(eq(scavengerHunts.slug, slug))
      .limit(1);
    return h?.id ?? null;
  } catch {
    return null;
  }
}

export async function getLeaderboard(huntSlug: string): Promise<LeaderRow[]> {
  if (!useDb) return [];
  try {
    const huntId = await huntIdForSlug(huntSlug);
    if (!huntId) return [];
    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        points: sql<number>`sum(${huntProgress.pointsAwarded})`,
        steps: sql<number>`count(*)`,
      })
      .from(huntProgress)
      .innerJoin(users, eq(users.id, huntProgress.userId))
      .where(eq(huntProgress.huntId, huntId))
      // Group by id, NOT name: grouping by name merged every player sharing a
      // first name into one row, and collapsed everyone without a display name
      // into a single "Adventurer" whose summed score topped the board.
      .groupBy(users.id, users.name)
      .orderBy(desc(sql`sum(${huntProgress.pointsAwarded})`))
      .limit(20);
    return rows.map((r) => ({
      userId: r.userId,
      name: r.name ?? "Adventurer",
      points: Number(r.points),
      steps: Number(r.steps),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Claiming an objective at its destination
// ---------------------------------------------------------------------------

export interface ClaimTarget {
  stepId: string;
  huntId: string;
  huntSlug: string;
  huntTitle: string;
  huntOpen: boolean;
  title: string;
  type: StepType;
  points: number;
  claimMode: ClaimMode;
  claimRadiusM: number | null;
  partnerName: string | null;
  partnerSlug: string | null;
  locationHint: string | null;
  eventLat: number | null;
  eventLng: number | null;
  rotationSeconds: number;
  stationKey: string | null;
  alreadyDone: boolean;
  /**
   * Title of the objective this one is waiting on, or null when it is open.
   *
   * Resolved here rather than in the UI because the claim itself has to honour
   * it — a tag is a URL anyone can open, so a lock the page merely draws is no
   * lock at all.
   */
  lockedBy: string | null;
}

/** Everything the claim route needs, resolved from a tag token's step id. */
export async function getClaimTarget(
  stepId: string,
  userId?: string
): Promise<ClaimTarget | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({
        s: huntSteps,
        h: scavengerHunts,
        partnerName: partners.businessName,
        partnerSlug: partners.slug,
        eventLat: events.lat,
        eventLng: events.lng,
        stationKey: huntStations.stationKey,
        rotationSeconds: huntStations.rotationSeconds,
      })
      .from(huntSteps)
      .innerJoin(scavengerHunts, eq(huntSteps.huntId, scavengerHunts.id))
      .leftJoin(partners, eq(huntSteps.partnerId, partners.id))
      .innerJoin(events, eq(scavengerHunts.eventId, events.id))
      .leftJoin(huntStations, eq(huntStations.stepId, huntSteps.id))
      .where(eq(huntSteps.id, stepId))
      .limit(1);
    if (!row) return null;

    let alreadyDone = false;
    if (userId) {
      const [p] = await db
        .select({ id: huntProgress.id })
        .from(huntProgress)
        .where(
          and(eq(huntProgress.stepId, stepId), eq(huntProgress.userId, userId))
        )
        .limit(1);
      alreadyDone = !!p;
    }

    // Only worth resolving for a signed-in player: the lock is per-person, and
    // a signed-out visitor is stopped earlier anyway.
    let lockedBy: string | null = null;
    if (userId && !alreadyDone) {
      const siblings = await stepsFor(row.h.id);
      const self = siblings.find((o) => o.id === row.s.id);
      if (self) {
        const done = await completedStepIds(row.h.id, userId);
        lockedBy = blockedBy(self, siblings, done, row.h.sequential);
      }
    }

    return {
      stepId: row.s.id,
      huntId: row.h.id,
      lockedBy,
      huntSlug: row.h.slug,
      huntTitle: row.h.title,
      huntOpen: isOpen(row.h),
      title: row.s.title,
      type: row.s.type,
      points: row.s.points,
      claimMode: row.s.claimMode,
      claimRadiusM: row.s.claimRadiusM,
      partnerName: row.partnerName,
      partnerSlug: row.partnerSlug,
      locationHint: row.s.locationHint,
      eventLat: row.eventLat,
      eventLng: row.eventLng,
      rotationSeconds: row.rotationSeconds ?? 60,
      stationKey: row.stationKey,
      alreadyDone,
    };
  } catch {
    return null;
  }
}

export async function logClaimAttempt(input: {
  stepId: string | null;
  userId: string | null;
  outcome: ClaimOutcome;
  claimMode?: ClaimMode | null;
  ip?: string | null;
}): Promise<void> {
  if (!useDb) return;
  try {
    await db.insert(huntClaimAttempts).values({
      stepId: input.stepId,
      userId: input.userId,
      outcome: input.outcome,
      claimMode: input.claimMode ?? null,
      ip: input.ip ?? null,
    });
  } catch {
    // Telemetry must never block a claim.
  }
}

/** Default venue geofence when an objective doesn't set its own, in metres. */
const DEFAULT_VENUE_RADIUS_M = 150;

/** Wrong-code attempts allowed per user, per objective, within the window. */
const MAX_BAD_ATTEMPTS = 10;
const BAD_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/**
 * A live code is four digits, and at any instant two of the ten thousand
 * verify. Unthrottled, that is ~5,000 requests to expect a hit — minutes of
 * scripted guessing, entirely remotely, since `live_code` has no geofence.
 * Rotation doesn't help: each guess is independent.
 *
 * Capping wrong answers per user per objective makes the expected cost of a
 * brute force absurd while staying far above what a real person fumbling a
 * code in a noisy hall would ever hit.
 */
async function tooManyBadAttempts(
  stepId: string,
  userId: string
): Promise<boolean> {
  if (!useDb) return false;
  try {
    const since = new Date(Date.now() - BAD_ATTEMPT_WINDOW_MS);
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(huntClaimAttempts)
      .where(
        and(
          eq(huntClaimAttempts.stepId, stepId),
          eq(huntClaimAttempts.userId, userId),
          eq(huntClaimAttempts.outcome, "bad_code"),
          gte(huntClaimAttempts.createdAt, since)
        )
      );
    return Number(row?.n ?? 0) >= MAX_BAD_ATTEMPTS;
  } catch {
    // A telemetry failure must not become a denial of service.
    return false;
  }
}

/**
 * Shortest believable gap between two check-in attempts by one person.
 *
 * Nobody walks between two stands, or retypes four digits after a fumble, in
 * under two seconds — so a real adventurer never meets this, while a script
 * replaying a shared tag URL in a loop is held to one attempt every two
 * seconds. Deliberately well under the pace a person could manage: the point
 * is to make automation slow, not to police anyone standing in a queue.
 */
const MIN_CLAIM_GAP_MS = 2000;

/**
 * True when this user attempted a check-in — on any objective, on any quest —
 * within the last {@link MIN_CLAIM_GAP_MS}.
 *
 * Every attempt is logged, throttled ones included, so a caller that keeps
 * hammering keeps pushing its own next allowed attempt out of reach.
 */
async function claimingTooFast(userId: string): Promise<boolean> {
  if (!useDb) return false;
  try {
    const since = new Date(Date.now() - MIN_CLAIM_GAP_MS);
    const [row] = await db
      .select({ id: huntClaimAttempts.id })
      .from(huntClaimAttempts)
      .where(
        and(
          eq(huntClaimAttempts.userId, userId),
          gte(huntClaimAttempts.createdAt, since)
        )
      )
      .limit(1);
    return !!row;
  } catch {
    // A telemetry failure must not become a denial of service.
    return false;
  }
}

/**
 * The single gate every destination check-in passes through. Returns the
 * outcome rather than throwing so the caller can render it *and* log it.
 */
export async function claimObjective(input: {
  target: ClaimTarget;
  userId: string;
  code?: string;
  lat?: number;
  lng?: number;
  ip?: string | null;
}): Promise<ClaimOutcome> {
  const { target, userId } = input;

  const finish = async (outcome: ClaimOutcome) => {
    await logClaimAttempt({
      stepId: target.stepId,
      userId,
      outcome,
      claimMode: target.claimMode,
      ip: input.ip,
    });
    return outcome;
  };

  if (!target.huntOpen) return finish("not_open");
  if (target.alreadyDone) return finish("duplicate");
  // Before any proof is examined: no point telling someone their code is wrong
  // when the objective wasn't open to them in the first place.
  if (target.lockedBy) return finish("locked");
  // Only once the objective is genuinely claimable: throttling a tap that was
  // going to be answered "you've already done this" is noise on the monitor.
  if (await claimingTooFast(userId)) return finish("rate_limited");

  switch (target.claimMode) {
    case "live_code": {
      if (await tooManyBadAttempts(target.stepId, userId)) {
        return finish("rate_limited");
      }
      if (!target.stationKey) return finish("bad_code");
      if (
        !input.code ||
        !verifyStationCode(target.stationKey, target.rotationSeconds, input.code)
      ) {
        return finish("bad_code");
      }
      break;
    }
    case "sealed_tag": {
      // Reserved for NTAG 424 DNA tags, which carry their own per-tap MAC.
      // Until that verification lands, a sealed objective is not claimable —
      // failing closed beats silently accepting an unverified tap.
      return finish("bad_code");
    }
    case "location_verified": {
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      const originLat = target.eventLat;
      const originLng = target.eventLng;
      // With no venue coordinates there is nothing to measure against, so the
      // objective degrades to `open` — which the admin is warned about on the
      // form, since the alternative is refusing every check-in at the event.
      if (originLat != null && originLng != null) {
        if (Number.isNaN(lat) || Number.isNaN(lng)) return finish("out_of_range");
        const away = haversine(
          { lat, lng },
          { lat: originLat, lng: originLng }
        );
        if (away > (target.claimRadiusM ?? DEFAULT_VENUE_RADIUS_M)) {
          return finish("out_of_range");
        }
      }
      break;
    }
    case "open": {
      // Nothing to check: the scan is the claim. Shareable by design, and the
      // pace and address flags on the admin monitor are what catch abuse.
      break;
    }
  }

  const written = await recordCompletion(
    target.huntId,
    target.stepId,
    userId,
    target.points,
    { via: target.claimMode }
  );
  // A false here after the duplicate check means the write itself failed.
  return finish(written ? "ok" : "duplicate");
}

/**
 * Check-in where the *vendor* scanned the *player*, rather than the other way
 * round. The station device is authenticated and physically at the stand, so
 * it is itself the proof of presence — there's no code to check. This is both
 * the fastest option at a busy stand and the hardest one to cheat.
 */
export async function claimViaStation(input: {
  target: ClaimTarget;
  userId: string;
  ip?: string | null;
}): Promise<ClaimOutcome> {
  const { target, userId } = input;
  const finish = async (outcome: ClaimOutcome) => {
    await logClaimAttempt({
      stepId: target.stepId,
      userId,
      outcome,
      claimMode: target.claimMode,
      ip: input.ip,
    });
    return outcome;
  };

  if (!target.huntOpen) return finish("not_open");
  if (target.alreadyDone) return finish("duplicate");
  // A station scan proves presence, not that a puzzle was solved, and it must
  // not quietly resurrect a mode that is meant to be unusable. Without this
  // guard an admin who set an objective to `sealed_tag` (documented as failing
  // closed) would find it fully claimable here, and a riddle with a partner
  // attached could be cleared without ever being answered.
  if (target.claimMode === "sealed_tag") return finish("bad_code");
  if (!isVisitStep(target.type)) return finish("bad_code");

  const written = await recordCompletion(
    target.huntId,
    target.stepId,
    userId,
    target.points,
    { via: "station_scan" }
  );
  return finish(written ? "ok" : "duplicate");
}

/** Display name for the vendor's confirmation flash after a scan. */
export async function displayName(userId: string): Promise<string> {
  if (!useDb) return "Adventurer";
  try {
    const [u] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return u?.name ?? "Adventurer";
  } catch {
    return "Adventurer";
  }
}

export interface MyStation {
  stepId: string;
  objectiveTitle: string;
  questTitle: string;
  questSlug: string;
  claimMode: ClaimMode;
  open: boolean;
  checkIns: number;
  /** Which stall this station belongs to — a user may staff several. */
  partnerId: string;
  partnerName: string;
}

/**
 * Every objective this user staffs, across every partner page they manage.
 * Surfaced on the partner hub so that on event day the station is one tap away
 * rather than buried behind a link an admin sent last week.
 */
export async function stationsForPartner(userId: string): Promise<MyStation[]> {
  if (!useDb || !userId) return [];
  try {
    const rows = await db
      .select({
        stepId: huntSteps.id,
        objectiveTitle: huntSteps.title,
        claimMode: huntSteps.claimMode,
        questTitle: scavengerHunts.title,
        questSlug: scavengerHunts.slug,
        active: scavengerHunts.active,
        startsAt: scavengerHunts.startsAt,
        endsAt: scavengerHunts.endsAt,
        partnerId: partners.id,
        partnerName: partners.businessName,
        checkIns: sql<number>`(select count(*) from ${huntProgress} where ${huntProgress.stepId} = ${huntSteps.id})`,
      })
      .from(huntSteps)
      .innerJoin(partners, eq(huntSteps.partnerId, partners.id))
      // Access comes from membership, not the legacy partners.user_id column.
      .innerJoin(
        partnerMembers,
        and(
          eq(partnerMembers.partnerId, partners.id),
          eq(partnerMembers.userId, userId)
        )
      )
      .innerJoin(scavengerHunts, eq(huntSteps.huntId, scavengerHunts.id))
      .orderBy(desc(scavengerHunts.createdAt), asc(huntSteps.sort));

    return rows.map((r) => ({
      stepId: r.stepId,
      objectiveTitle: r.objectiveTitle,
      questTitle: r.questTitle,
      questSlug: r.questSlug,
      claimMode: r.claimMode,
      open: isOpen({
        active: r.active,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
      }),
      checkIns: Number(r.checkIns ?? 0),
      partnerId: r.partnerId,
      partnerName: r.partnerName,
    }));
  } catch {
    return [];
  }
}

/** The real running total for a station — the recent list is capped at 8. */
export async function stationCheckInCount(stepId: string): Promise<number> {
  if (!useDb) return 0;
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(huntProgress)
      .where(eq(huntProgress.stepId, stepId));
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

/** Most recent check-ins at one station, for the vendor's running tally. */
export async function recentStationCheckIns(
  stepId: string,
  limit = 8
): Promise<{ name: string; at: Date }[]> {
  if (!useDb) return [];
  try {
    const rows = await db
      .select({ name: users.name, at: huntProgress.completedAt })
      .from(huntProgress)
      .innerJoin(users, eq(users.id, huntProgress.userId))
      .where(eq(huntProgress.stepId, stepId))
      .orderBy(desc(huntProgress.completedAt))
      .limit(limit);
    return rows.map((r) => ({ name: r.name ?? "Adventurer", at: r.at }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

/** Creates the station row (and its key) on first use. Idempotent. */
export async function ensureStation(
  stepId: string
): Promise<{ stationKey: string; rotationSeconds: number } | null> {
  if (!useDb) return null;
  try {
    const [existing] = await db
      .select({
        stationKey: huntStations.stationKey,
        rotationSeconds: huntStations.rotationSeconds,
      })
      .from(huntStations)
      .where(eq(huntStations.stepId, stepId))
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(huntStations)
      .values({ stepId, stationKey: newStationKey() })
      .onConflictDoNothing()
      .returning({
        stationKey: huntStations.stationKey,
        rotationSeconds: huntStations.rotationSeconds,
      });
    if (created) return created;

    // Lost the race — read the winner's row.
    const [now] = await db
      .select({
        stationKey: huntStations.stationKey,
        rotationSeconds: huntStations.rotationSeconds,
      })
      .from(huntStations)
      .where(eq(huntStations.stepId, stepId))
      .limit(1);
    return now ?? null;
  } catch {
    return null;
  }
}

export async function touchStation(stepId: string): Promise<void> {
  if (!useDb) return;
  try {
    await db
      .update(huntStations)
      .set({ lastSeenAt: new Date() })
      .where(eq(huntStations.stepId, stepId));
  } catch {
    // Best-effort liveness only.
  }
}
