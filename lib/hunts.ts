import "server-only";
import { db } from "@/lib/db";
import {
  scavengerHunts,
  huntSteps,
  huntProgress,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

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

export interface PublicStep {
  id: string;
  type: StepType;
  title: string;
  prompt: string;
  points: number;
  choices?: string[]; // trivia only — never includes the answer
  done: boolean;
}

export interface HuntView {
  slug: string;
  title: string;
  description: string;
  mode: string;
  steps: PublicStep[];
  totalPoints: number;
  earnedPoints: number;
}

export interface LeaderRow {
  name: string;
  points: number;
  steps: number;
}

interface RawStep {
  id: string;
  type: StepType;
  title: string;
  prompt: string;
  points: number;
  config: Record<string, unknown>;
}
interface RawHunt {
  slug: string;
  title: string;
  description: string;
  mode: string;
  steps: RawStep[];
}

// ---------------------------------------------------------------------------
// Dev sample hunt (answers live here, server-side only — never sent to client)
// ---------------------------------------------------------------------------
const SAMPLE_HUNTS: RawHunt[] = [
  {
    slug: "launch-night-recon",
    title: "Launch Night Recon",
    description:
      "Six objectives to christen the new hangar. Solve, scan and prove your way to the top of the board.",
    mode: "hybrid",
    steps: [
      {
        id: "s1",
        type: "riddle",
        title: "Cipher lock",
        prompt:
          "I have keys but open no locks. I have space but no room. You can enter but not go in. What am I?",
        points: 10,
        config: { answer: "keyboard" },
      },
      {
        id: "s2",
        type: "unlock_code",
        title: "Hangar access code",
        prompt: "Find the code stencilled near the maker bay and enter it.",
        points: 10,
        config: { code: "ALPHA-7" },
      },
      {
        id: "s3",
        type: "trivia_gate",
        title: "Mecha trivia",
        prompt: "Which term describes a pilot's neural link to their mech?",
        points: 15,
        config: {
          choices: ["Sync rate", "Boot loop", "Overdrive", "Cooldown"],
          correct: 0,
        },
      },
      {
        id: "s4",
        type: "geo_checkpoint",
        title: "Reach the beacon",
        prompt: "Make your way to the hangar coordinates and check in.",
        points: 20,
        config: { lat: -33.9249, lng: 18.4241, radius_m: 50000 },
      },
      {
        id: "s5",
        type: "qr_scan",
        title: "Data uplink",
        prompt: "Scan the uplink QR posted at the arcade station.",
        points: 20,
        config: {},
      },
      {
        id: "s6",
        type: "photo_proof",
        title: "Pilot selfie",
        prompt: "Upload a photo of your launch-night badge.",
        points: 15,
        config: { auto_approve: true },
      },
    ],
  },
];

function publicStep(s: RawStep, done: boolean): PublicStep {
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
  };
}

async function rawHunt(slug: string): Promise<RawHunt | null> {
  if (!useDb) return SAMPLE_HUNTS.find((h) => h.slug === slug) ?? null;
  try {
    const [h] = await db
      .select()
      .from(scavengerHunts)
      .where(eq(scavengerHunts.slug, slug))
      .limit(1);
    if (!h) return SAMPLE_HUNTS.find((x) => x.slug === slug) ?? null;
    const steps = await db
      .select()
      .from(huntSteps)
      .where(eq(huntSteps.huntId, h.id))
      .orderBy(huntSteps.sort);
    return {
      slug: h.slug,
      title: h.title,
      description: h.description ?? "",
      mode: h.mode,
      steps: steps.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        prompt: s.prompt ?? "",
        points: s.points,
        config: (s.config as Record<string, unknown>) ?? {},
      })),
    };
  } catch {
    return SAMPLE_HUNTS.find((x) => x.slug === slug) ?? null;
  }
}

export async function listHunts(): Promise<
  { slug: string; title: string; description: string; steps: number }[]
> {
  if (!useDb)
    return SAMPLE_HUNTS.map((h) => ({
      slug: h.slug,
      title: h.title,
      description: h.description,
      steps: h.steps.length,
    }));
  try {
    const hs = await db
      .select()
      .from(scavengerHunts)
      .where(eq(scavengerHunts.active, true))
      .orderBy(desc(scavengerHunts.createdAt));
    if (hs.length === 0)
      return SAMPLE_HUNTS.map((h) => ({
        slug: h.slug,
        title: h.title,
        description: h.description,
        steps: h.steps.length,
      }));
    const out = [];
    for (const h of hs) {
      const [c] = await db
        .select({ n: sql<number>`count(*)` })
        .from(huntSteps)
        .where(eq(huntSteps.huntId, h.id));
      out.push({
        slug: h.slug,
        title: h.title,
        description: h.description ?? "",
        steps: Number(c?.n ?? 0),
      });
    }
    return out;
  } catch {
    return SAMPLE_HUNTS.map((h) => ({
      slug: h.slug,
      title: h.title,
      description: h.description,
      steps: h.steps.length,
    }));
  }
}

async function completedStepIds(
  huntSlug: string,
  userId: string
): Promise<Set<string>> {
  if (!useDb) return new Set();
  try {
    const [h] = await db
      .select({ id: scavengerHunts.id })
      .from(scavengerHunts)
      .where(eq(scavengerHunts.slug, huntSlug))
      .limit(1);
    if (!h) return new Set();
    const rows = await db
      .select({ stepId: huntProgress.stepId })
      .from(huntProgress)
      .where(
        and(eq(huntProgress.huntId, h.id), eq(huntProgress.userId, userId))
      );
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
  const done = userId ? await completedStepIds(slug, userId) : new Set<string>();
  const steps = raw.steps.map((s) => publicStep(s, done.has(s.id)));
  return {
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    mode: raw.mode,
    steps,
    totalPoints: raw.steps.reduce((a, s) => a + s.points, 0),
    earnedPoints: steps
      .filter((s) => s.done)
      .reduce((a, s) => a + s.points, 0),
  };
}

/** Server-only: the full raw step (with answer config) for verification. */
export async function getStepRaw(
  huntSlug: string,
  stepId: string
): Promise<RawStep | null> {
  const raw = await rawHunt(huntSlug);
  return raw?.steps.find((s) => s.id === stepId) ?? null;
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
        norm(String(submitted.code ?? "")) ===
        norm(String(step.config.code ?? ""))
      );
    case "trivia_gate":
      return Number(submitted.choice) === Number(step.config.correct);
    case "geo_checkpoint": {
      const lat = Number(submitted.lat);
      const lng = Number(submitted.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
      const target = {
        lat: Number(step.config.lat),
        lng: Number(step.config.lng),
      };
      return haversine({ lat, lng }, target) <= Number(step.config.radius_m);
    }
    case "photo_proof":
      return Boolean(submitted.fileUrl) || step.config.auto_approve === true;
    case "qr_scan":
      return submitted.scanned === true; // verified via signed token route
    default:
      return false;
  }
}

export async function recordCompletion(
  huntSlug: string,
  stepId: string,
  userId: string,
  points: number,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!useDb) return true; // demo mode — treat as success, no persistence
  try {
    const [h] = await db
      .select({ id: scavengerHunts.id })
      .from(scavengerHunts)
      .where(eq(scavengerHunts.slug, huntSlug))
      .limit(1);
    if (!h) return false;
    await db
      .insert(huntProgress)
      .values({
        huntId: h.id,
        stepId,
        userId,
        pointsAwarded: points,
        payload,
      })
      .onConflictDoNothing();
    return true;
  } catch {
    return false;
  }
}

export async function getLeaderboard(huntSlug: string): Promise<LeaderRow[]> {
  if (!useDb) return [];
  try {
    const [h] = await db
      .select({ id: scavengerHunts.id })
      .from(scavengerHunts)
      .where(eq(scavengerHunts.slug, huntSlug))
      .limit(1);
    if (!h) return [];
    const rows = await db
      .select({
        name: users.name,
        points: sql<number>`sum(${huntProgress.pointsAwarded})`,
        steps: sql<number>`count(*)`,
      })
      .from(huntProgress)
      .innerJoin(users, eq(users.id, huntProgress.userId))
      .where(eq(huntProgress.huntId, h.id))
      .groupBy(users.name)
      .orderBy(desc(sql`sum(${huntProgress.pointsAwarded})`))
      .limit(20);
    return rows.map((r) => ({
      name: r.name ?? "Pilot",
      points: Number(r.points),
      steps: Number(r.steps),
    }));
  } catch {
    return [];
  }
}
