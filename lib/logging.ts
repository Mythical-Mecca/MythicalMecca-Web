import "server-only";
import { db } from "@/lib/db";
import { activityLog, errorLog, pageHits } from "@/lib/db/schema";

type ActivityInput = {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

/**
 * Fire-and-forget activity logging. Never throws into the caller's path —
 * logging must not break the user experience.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await db.insert(activityLog).values({
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    });
  } catch (err) {
    console.error("[logActivity] failed", err);
  }
}

type ErrorInput = {
  level?: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  stack?: string;
  route?: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
};

export async function logError(input: ErrorInput): Promise<void> {
  try {
    await db.insert(errorLog).values({
      level: input.level ?? "error",
      message: input.message,
      stack: input.stack,
      route: input.route,
      actorId: input.actorId ?? null,
      metadata: input.metadata,
      requestId: input.requestId ?? null,
    });
  } catch (err) {
    console.error("[logError] failed", err);
  }
}

type HitInput = {
  path: string;
  actorId?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logPageHit(input: HitInput): Promise<void> {
  try {
    await db.insert(pageHits).values({
      path: input.path,
      actorId: input.actorId ?? null,
      referrer: input.referrer ?? null,
      sessionId: input.sessionId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[logPageHit] failed", err);
  }
}
