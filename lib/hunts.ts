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
  eventPlayers,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { newStationKey, verifyStationCode } from "@/lib/qr";
import { isStoredMediaUrl, toMediaSrc } from "@/lib/media";
import { signupStepFor, type SignupStep } from "@/lib/signup";
import type { Claimant } from "@/lib/claimant";

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

/** Which progress rows belong to this claimant. */
const progressIs = (who: Claimant) =>
  who.kind === "member"
    ? eq(huntProgress.userId, who.userId)
    : eq(huntProgress.playerId, who.playerId);

/** Which claim-attempt rows belong to this claimant. */
const attemptIs = (who: Claimant) =>
  who.kind === "member"
    ? eq(huntClaimAttempts.userId, who.userId)
    : eq(huntClaimAttempts.playerId, who.playerId);

/** The one column to write on an insert. */
const claimantColumns = (who: Claimant | null) =>
  who === null
    ? {}
    : who.kind === "member"
      ? { userId: who.userId }
      : { playerId: who.playerId };

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
  | "locked"
  /** A member account at a no-data event, or a player anywhere else. */
  | "wrong_account"
  | "not_allowed";

/**
 * `qr_scan` is the workhorse type for a venue quest: "get to the destination
 * and check in there". Everything else is answered in the app without moving.
 */
export const isVisitStep = (t: StepType) => t === "qr_scan";

export interface Destination {
  partnerSlug: string | null;
  partnerName: string | null;
  /**
   * Display-ready: the Blob store is private, so this has already been through
   * toMediaSrc. Null when the stand has no logo, or when the objective sends
   * you somewhere that isn't a partner at all.
   */
  partnerLogo: string | null;
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
  /** True when this was a hidden extra — shown only because they unlocked it. */
  hidden: boolean;
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
  /**
   * Vendor + stall for Easy mode. Always present when the objective names a
   * destination — unlike `destination`, this is not withheld for clues, because
   * Easy mode is the directory that skips the puzzle.
   */
  directory: Destination | null;
}

export interface PrizeTier {
  points: number;
  entries: number;
}

export interface HuntView {
  slug: string;
  /** See scavengerHunts.prizeTiers. Ascending by points; empty when no draw. */
  prizeTiers: PrizeTier[];
  /** True when the trail must be walked in order — drives the player copy. */
  sequential: boolean;
  title: string;
  description: string;
  mode: string;
  steps: PublicStep[];
  totalPoints: number;
  earnedPoints: number;
  /**
   * Hidden extras still off the board. Shown as empty ? medallions so the
   * cabinet (and the points total) makes clear there is more to find.
   */
  hiddenRemaining: number;
  /**
   * Null when the quest's event isn't public yet — the event exists (the FK is
   * NOT NULL) but a draft has no page to link to.
   */
  eventSlug: string | null;
  eventTitle: string;
  /**
   * Where the event itself lives online, when it has told us. Shown as a
   * sign-up link on the player panel, so someone who has not registered for
   * the day is one tap from doing so.
   */
  eventUrl: string | null;
  /** The owning event — a player session is scoped to exactly one of these. */
  eventId: string;
  /** True when this quest admits event players only. See events.noDataMode. */
  noDataMode: boolean;
  /**
   * False only when the quest runs on an allow list and this adventurer is
   * not on it. True for everyone when the list is off, and true when nobody
   * is signed in — a stranger gets the teaser, not a rejection.
   */
  allowed: boolean;
  /** True when the quest is restricted at all, whoever is reading. */
  allowListEnabled: boolean;
  open: boolean;
  /**
   * The event's external sign-up step, resolved for this player. Null when
   * the event doesn't ask for one, and null for members — the step exists for
   * events where we hold no personal data, which is not their world.
   */
  signup: SignupStep | null;
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
  hidden: boolean;
  claimMode: ClaimMode;
  claimRadiusM: number | null;
  partnerId: string | null;
  partnerSlug: string | null;
  partnerName: string | null;
  partnerLogo: string | null;
  locationHint: string | null;
}
interface RawHunt {
  id: string;
  slug: string;
  eventUrl: string | null;
  signupUrl: string | null;
  signupLabel: string | null;
  signupBlurb: string | null;
  prizeTiers: PrizeTier[];
  sequential: boolean;
  allowListEnabled: boolean;
  allowList: string[];
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
  eventId: string;
  /** True when this quest's event admits event players only. */
  noDataMode: boolean;
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
    .select({
      s: huntSteps,
      partnerSlug: partners.slug,
      partnerName: partners.businessName,
      partnerLogo: partners.logoUrl,
    })
    .from(huntSteps)
    .leftJoin(partners, eq(huntSteps.partnerId, partners.id))
    .where(eq(huntSteps.huntId, huntId))
    .orderBy(huntSteps.sort);
  return rows.map(({ s, partnerSlug, partnerName, partnerLogo }) => ({
    id: s.id,
    sort: s.sort,
    parentId: s.parentId,
    type: s.type,
    title: s.title,
    prompt: s.prompt ?? "",
    points: s.points,
    config: (s.config as Record<string, unknown>) ?? {},
    revealMode: s.revealMode,
    hidden: s.hidden,
    claimMode: s.claimMode,
    claimRadiusM: s.claimRadiusM,
    partnerId: s.partnerId,
    partnerSlug,
    partnerName,
    partnerLogo: toMediaSrc(partnerLogo),
    locationHint: s.locationHint,
  }));
}

async function rawHunt(slug: string): Promise<RawHunt | null> {
  if (!useDb) return null;
  const [row] = await db
    .select({
      h: scavengerHunts,
      eventId: events.id,
      eventSlug: events.slug,
      eventTitle: events.title,
      eventUrl: events.externalUrl,
      eventLat: events.lat,
      eventLng: events.lng,
      noDataMode: events.noDataMode,
      signupUrl: events.signupUrl,
      signupLabel: events.signupLabel,
      signupBlurb: events.signupBlurb,
    })
    .from(scavengerHunts)
    .innerJoin(events, eq(scavengerHunts.eventId, events.id))
    .where(eq(scavengerHunts.slug, slug))
    .limit(1);
  if (!row) return null;
  return {
    id: row.h.id,
    slug: row.h.slug,
    prizeTiers: row.h.prizeTiers ?? [],
    sequential: row.h.sequential,
    title: row.h.title,
    description: row.h.description ?? "",
    mode: row.h.mode,
    eventSlug: row.eventSlug,
    eventTitle: row.eventTitle,
    eventUrl: row.eventUrl,
    signupUrl: row.signupUrl,
    signupLabel: row.signupLabel,
    signupBlurb: row.signupBlurb,
    eventId: row.eventId,
    eventLat: row.eventLat,
    eventLng: row.eventLng,
    noDataMode: row.noDataMode,
    allowListEnabled: row.h.allowListEnabled,
    allowList: row.h.allowList ?? [],
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
 * Hidden extras sit beside the trail: they wait only on a named parent, never
 * on the sequential line, so a secret QR cannot stall the stands.
 *
 * Returns the blocking objective's title, or null when nothing blocks it.
 */
function blockedBy(
  step: RawStep,
  all: RawStep[],
  doneIds: Set<string>,
  sequential: boolean
): string | null {
  if (step.hidden) {
    if (!step.parentId) return null;
    if (doneIds.has(step.parentId)) return null;
    return all.find((o) => o.id === step.parentId)?.title ?? null;
  }
  if (sequential) {
    const earlier = all
      .filter((o) => !o.hidden && o.sort < step.sort)
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

/**
 * Hidden extras stay off the quest page until unlocked.
 *
 * Claiming the tag itself unlocks it. Clearing a named parent also reveals
 * it, so the extra QR / PIN / riddle can be handed over in the viewer.
 */
function listedForPlayer(step: RawStep, doneIds: Set<string>): boolean {
  if (!step.hidden) return true;
  if (doneIds.has(step.id)) return true;
  return step.parentId !== null && doneIds.has(step.parentId);
}

function publicStep(
  s: RawStep,
  done: boolean,
  lockedBy: string | null = null
): PublicStep {
  // A "clue" objective withholds *where* until it's been claimed — revealing
  // the vendor early would hand over the answer.
  const reveal = s.revealMode === "direct" || done;
  const dest: Destination = {
    partnerSlug: s.partnerSlug,
    partnerName: s.partnerName,
    partnerLogo: s.partnerLogo,
    locationHint: s.locationHint,
  };
  const hasDirectory = !!(s.partnerSlug || s.partnerName || s.locationHint);
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
    hidden: s.hidden,
    claimMode: s.claimMode,
    locked: lockedBy !== null,
    lockedBy,
    destination: reveal ? dest : null,
    directory: hasDirectory ? dest : null,
  };
}

export interface EventHuntCard {
  slug: string;
  title: string;
  description: string;
  steps: number;
  /** False when the trail is scheduled but not claimable yet. */
  open: boolean;
}

/**
 * Active quests tied to an event, for the event detail page.
 *
 * Upcoming trails are included: the event page is how you find the hunt
 * before the doors open. Ended or deactivated ones stay off the list.
 */
export async function listHuntsForEvent(
  eventId: string
): Promise<EventHuntCard[]> {
  if (!useDb) return [];
  try {
    const now = new Date();
    const rows = await db
      .select({
        slug: scavengerHunts.slug,
        title: scavengerHunts.title,
        description: scavengerHunts.description,
        active: scavengerHunts.active,
        startsAt: scavengerHunts.startsAt,
        endsAt: scavengerHunts.endsAt,
        steps: sql<number>`(select count(*) from ${huntSteps} where ${huntSteps.huntId} = ${scavengerHunts.id} and ${huntSteps.hidden} = false)`,
      })
      .from(scavengerHunts)
      .where(
        and(
          eq(scavengerHunts.eventId, eventId),
          eq(scavengerHunts.active, true),
          or(isNull(scavengerHunts.endsAt), gte(scavengerHunts.endsAt, now))
        )
      )
      .orderBy(scavengerHunts.createdAt);
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      steps: Number(r.steps ?? 0),
      open: isOpen(r),
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
export async function listHunts(who?: Claimant): Promise<HuntCard[]> {
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
        steps: sql<number>`(select count(*) from ${huntSteps} where ${huntSteps.huntId} = ${scavengerHunts.id} and ${huntSteps.hidden} = false)`,
        done: !who
          ? sql<number>`0`
          : who.kind === "member"
            ? sql<number>`(select count(*) from ${huntProgress} inner join ${huntSteps} on ${huntSteps.id} = ${huntProgress.stepId} where ${huntProgress.huntId} = ${scavengerHunts.id} and ${huntProgress.userId} = ${who.userId} and ${huntSteps.hidden} = false)`
            : sql<number>`(select count(*) from ${huntProgress} inner join ${huntSteps} on ${huntSteps.id} = ${huntProgress.stepId} where ${huntProgress.huntId} = ${scavengerHunts.id} and ${huntProgress.playerId} = ${who.playerId} and ${huntSteps.hidden} = false)`,
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
  who: Claimant
): Promise<Set<string>> {
  if (!useDb) return new Set();
  try {
    const rows = await db
      .select({ stepId: huntProgress.stepId })
      .from(huntProgress)
      .where(and(eq(huntProgress.huntId, huntId), progressIs(who)));
    return new Set(rows.map((r) => r.stepId));
  } catch {
    return new Set();
  }
}

export async function getHunt(
  slug: string,
  who?: Claimant
): Promise<HuntView | null> {
  const raw = await rawHunt(slug);
  if (!raw) return null;
  const done = who ? await completedStepIds(raw.id, who) : new Set<string>();
  const listed = raw.steps.filter((s) => listedForPlayer(s, done));
  const steps = listed.map((s) =>
    publicStep(s, done.has(s.id), blockedBy(s, raw.steps, done, raw.sequential))
  );
  const hiddenRemaining = raw.steps.filter(
    (s) => s.hidden && !listedForPlayer(s, done)
  ).length;
  return {
    slug: raw.slug,
    prizeTiers: raw.prizeTiers,
    sequential: raw.sequential,
    title: raw.title,
    description: raw.description,
    mode: raw.mode,
    steps,
    // Grand total — hidden extras included, so the hoard shows there is more
    // to find than the open board alone.
    totalPoints: raw.steps.reduce((a, s) => a + s.points, 0),
    earnedPoints: steps.filter((s) => s.done).reduce((a, s) => a + s.points, 0),
    hiddenRemaining,
    eventSlug: raw.eventSlug,
    eventTitle: raw.eventTitle,
    eventUrl: raw.eventUrl,
    eventId: raw.eventId,
    noDataMode: raw.noDataMode,
    allowed: await onAllowList(raw, who),
    allowListEnabled: raw.allowListEnabled,
    open: raw.open,
    signup:
      who?.kind === "player" ? await signupStepFor(raw, who.playerId) : null,
  };
}

/**
 * Where a score sits on the prize ladder: entries held now, and the next
 * rung up if there is one. Pure, so the page and the admin preview agree.
 */
export function prizeStanding(
  tiers: PrizeTier[],
  points: number
): { entries: number; next: PrizeTier | null } {
  let entries = 0;
  let next: PrizeTier | null = null;
  for (const t of tiers) {
    if (points >= t.points) entries = Math.max(entries, t.entries);
    else if (!next || t.points < next.points) next = t;
  }
  return { entries, next };
}

/**
 * The identity an allow list is written against: an email for a member, a
 * handle for a player, both normalised the way the list is stored.
 *
 * Resolved here rather than carried on {@link Claimant} because it is needed
 * only when a list is switched on, and threading an email through every claim
 * path would put a member's address into places that have no business
 * holding one.
 */
async function identityFor(who: Claimant): Promise<string | null> {
  if (!useDb) return null;
  try {
    if (who.kind === "member") {
      const [row] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, who.userId))
        .limit(1);
      return row?.email?.trim().toLowerCase() || null;
    }
    const [row] = await db
      .select({ handle: eventPlayers.handle })
      .from(eventPlayers)
      .where(eq(eventPlayers.id, who.playerId))
      .limit(1);
    return row?.handle?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * May this adventurer play?
 *
 * An enabled-but-empty list admits nobody, and an identity we cannot resolve
 * is not on any list. Both fail closed: an allow list that silently stops
 * enforcing is worse than one that locks its author out, because only the
 * second gets noticed.
 */
async function onAllowList(
  hunt: { allowListEnabled: boolean; allowList: string[] },
  who: Claimant | undefined
): Promise<boolean> {
  if (!hunt.allowListEnabled) return true;
  if (!who) return true; // Nobody signed in yet — that is the teaser's job.
  if (hunt.allowList.length === 0) return false;
  const me = await identityFor(who);
  return me !== null && hunt.allowList.includes(me);
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
  who?: Claimant
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
  const done = who ? await completedStepIds(raw.id, who) : new Set<string>();
  const lockedBy = who ? blockedBy(step, raw.steps, done, raw.sequential) : null;
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
  who: Claimant,
  points: number,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!useDb) return false;
  try {
    const inserted = await db
      .insert(huntProgress)
      .values({
        huntId,
        stepId,
        ...claimantColumns(who),
        pointsAwarded: points,
        payload,
      })
      .onConflictDoNothing()
      .returning({ id: huntProgress.id });
    return inserted.length > 0;
  } catch {
    return false;
  }
}

/**
 * The event a quest belongs to, and whether it admits players only.
 *
 * Enough to resolve who is signed in, without loading the trail. Every path
 * that gates a quest needs this before it can decide what "signed in" means.
 */
export async function huntEventFor(
  huntSlug: string
): Promise<{ id: string; noDataMode: boolean } | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({ id: events.id, noDataMode: events.noDataMode })
      .from(scavengerHunts)
      .innerJoin(events, eq(scavengerHunts.eventId, events.id))
      .where(eq(scavengerHunts.slug, huntSlug))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
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
    // Left joins, not inner: a row belongs to exactly one of the two, so an
    // inner join on either would drop the other kind entirely. In practice a
    // quest only ever sees one — a no-data event admits no members, and every
    // other event admits no players — but the board shouldn't depend on that.
    const rows = await db
      .select({
        userId: users.id,
        playerId: eventPlayers.id,
        name: users.name,
        handle: eventPlayers.handle,
        points: sql<number>`sum(${huntProgress.pointsAwarded})`,
        steps: sql<number>`count(*)`,
      })
      .from(huntProgress)
      .leftJoin(users, eq(users.id, huntProgress.userId))
      .leftJoin(eventPlayers, eq(eventPlayers.id, huntProgress.playerId))
      .where(eq(huntProgress.huntId, huntId))
      // Group by id, NOT name: grouping by name merged every player sharing a
      // first name into one row, and collapsed everyone without a display name
      // into a single "Adventurer" whose summed score topped the board.
      .groupBy(users.id, users.name, eventPlayers.id, eventPlayers.handle)
      .orderBy(desc(sql`sum(${huntProgress.pointsAwarded})`))
      .limit(20);
    return rows.map((r) => ({
      userId: r.userId ?? r.playerId ?? "",
      name: r.name ?? r.handle ?? "Adventurer",
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
  /** Whether the trail is strictly ordered — {@link forClaimant} needs it. */
  sequential: boolean;
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
  eventId: string;
  eventLat: number | null;
  eventLng: number | null;
  /**
   * True when the quest's event admits players only. Resolved here because
   * the claim itself has to honour it — a tag URL is a public string, so a
   * rule the sign-in panel merely draws is no rule at all.
   */
  noDataMode: boolean;
  /** See scavengerHunts.allowList — the claim has to honour it too. */
  allowListEnabled: boolean;
  allowList: string[];
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
  who?: Claimant
): Promise<ClaimTarget | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({
        s: huntSteps,
        h: scavengerHunts,
        partnerName: partners.businessName,
        partnerSlug: partners.slug,
        eventId: events.id,
        eventLat: events.lat,
        eventLng: events.lng,
        noDataMode: events.noDataMode,
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

    const base: ClaimTarget = {
      stepId: row.s.id,
      huntId: row.h.id,
      sequential: row.h.sequential,
      lockedBy: null,
      alreadyDone: false,
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
      eventId: row.eventId,
      eventLat: row.eventLat,
      eventLng: row.eventLng,
      noDataMode: row.noDataMode,
      allowListEnabled: row.h.allowListEnabled,
      allowList: row.h.allowList ?? [],
      rotationSeconds: row.rotationSeconds ?? 60,
      stationKey: row.stationKey,
    };

    return who ? await forClaimant(base, who) : base;
  } catch {
    return null;
  }
}

/**
 * Fill in the two per-person fields of a target that was resolved without
 * knowing who was asking.
 *
 * Both claim paths have a chicken-and-egg problem: which kind of adventurer is
 * signed in depends on the event, and the event isn't known until the step has
 * been looked up. So they fetch the target first, resolve the claimant from
 * `noDataMode`, then come back here — rather than running the whole join a
 * second time.
 */
export async function forClaimant(
  target: ClaimTarget,
  who: Claimant
): Promise<ClaimTarget> {
  if (!useDb) return target;
  try {
    const [p] = await db
      .select({ id: huntProgress.id })
      .from(huntProgress)
      .where(and(eq(huntProgress.stepId, target.stepId), progressIs(who)))
      .limit(1);
    if (p) return { ...target, alreadyDone: true, lockedBy: null };

    // Only worth resolving for someone signed in: the lock is per-person, and
    // a signed-out visitor is stopped earlier anyway.
    const siblings = await stepsFor(target.huntId);
    const self = siblings.find((o) => o.id === target.stepId);
    if (!self) return target;
    const done = await completedStepIds(target.huntId, who);
    return {
      ...target,
      alreadyDone: false,
      lockedBy: blockedBy(self, siblings, done, target.sequential),
    };
  } catch {
    return target;
  }
}

export async function logClaimAttempt(input: {
  stepId: string | null;
  /** Null for a forged tag or pass, where there is nobody to attribute it to. */
  who: Claimant | null;
  outcome: ClaimOutcome;
  claimMode?: ClaimMode | null;
  ip?: string | null;
}): Promise<void> {
  if (!useDb) return;
  try {
    await db.insert(huntClaimAttempts).values({
      stepId: input.stepId,
      ...claimantColumns(input.who),
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
  who: Claimant
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
          attemptIs(who),
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
async function claimingTooFast(who: Claimant): Promise<boolean> {
  if (!useDb) return false;
  try {
    const since = new Date(Date.now() - MIN_CLAIM_GAP_MS);
    const [row] = await db
      .select({ id: huntClaimAttempts.id })
      .from(huntClaimAttempts)
      .where(and(attemptIs(who), gte(huntClaimAttempts.createdAt, since)))
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
  who: Claimant;
  code?: string;
  lat?: number;
  lng?: number;
  ip?: string | null;
}): Promise<ClaimOutcome> {
  const { target, who } = input;

  const finish = async (outcome: ClaimOutcome) => {
    await logClaimAttempt({
      stepId: target.stepId,
      who,
      outcome,
      claimMode: target.claimMode,
      ip: input.ip,
    });
    return outcome;
  };

  // The event decides which kind of adventurer exists here, and it decides it
  // for both directions: a member account is not welcome at a no-data event,
  // and a player session is not welcome anywhere else. Checked before the
  // quest window so that "you're the wrong kind of signed in" never arrives
  // dressed as "this quest isn't running".
  if (target.noDataMode !== (who.kind === "player")) {
    return finish("wrong_account");
  }

  // A tag URL is a public string, so a list the quest page merely draws is no
  // list at all — the claim itself has to hold it.
  if (!(await onAllowList(target, who))) {
    return finish("not_allowed");
  }

  if (!target.huntOpen) return finish("not_open");
  if (target.alreadyDone) return finish("duplicate");
  // Before any proof is examined: no point telling someone their code is wrong
  // when the objective wasn't open to them in the first place.
  if (target.lockedBy) return finish("locked");
  // Only once the objective is genuinely claimable: throttling a tap that was
  // going to be answered "you've already done this" is noise on the monitor.
  if (await claimingTooFast(who)) return finish("rate_limited");

  switch (target.claimMode) {
    case "live_code": {
      if (await tooManyBadAttempts(target.stepId, who)) {
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
    who,
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
  who: Claimant;
  ip?: string | null;
}): Promise<ClaimOutcome> {
  const { target, who } = input;
  const finish = async (outcome: ClaimOutcome) => {
    await logClaimAttempt({
      stepId: target.stepId,
      who,
      outcome,
      claimMode: target.claimMode,
      ip: input.ip,
    });
    return outcome;
  };

  // Same rule as the tag path. A pass is minted for whoever was signed in when
  // it was drawn, so this is where a member's pass gets refused at a no-data
  // event — the vendor's scanner is authenticated, but it isn't the authority
  // on who the event admits.
  if (target.noDataMode !== (who.kind === "player")) {
    return finish("wrong_account");
  }

  // A tag URL is a public string, so a list the quest page merely draws is no
  // list at all — the claim itself has to hold it.
  if (!(await onAllowList(target, who))) {
    return finish("not_allowed");
  }

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
    who,
    target.points,
    { via: "station_scan" }
  );
  return finish(written ? "ok" : "duplicate");
}

/** Display name for the vendor's confirmation flash after a scan. */
export async function claimantName(who: Claimant): Promise<string> {
  if (!useDb) return "Adventurer";
  try {
    if (who.kind === "player") {
      const [p] = await db
        .select({ handle: eventPlayers.handle })
        .from(eventPlayers)
        .where(eq(eventPlayers.id, who.playerId))
        .limit(1);
      return p?.handle ?? "Adventurer";
    }
    const [u] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, who.userId))
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
