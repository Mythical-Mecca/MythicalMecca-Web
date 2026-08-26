import "server-only";
import { db } from "@/lib/db";
import { huntSteps, scavengerHunts, partners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import { getMembership } from "@/lib/partner-access";

export interface StationContext {
  stepId: string;
  objectiveTitle: string;
  questTitle: string;
  questSlug: string;
  partnerName: string | null;
}

/**
 * A station page may be opened by anyone who manages the partner staffing that
 * objective, or by an admin (who may be setting it up on a loaner device).
 * Anyone else gets nothing — the station view is the one place a live code is
 * on display.
 */
export async function authorizeStation(
  stepId: string
): Promise<StationContext | null> {
  if (!process.env.DATABASE_URL) return null;
  const session = await auth();
  if (!session?.user) return null;

  try {
    const [row] = await db
      .select({
        stepId: huntSteps.id,
        objectiveTitle: huntSteps.title,
        claimMode: huntSteps.claimMode,
        questTitle: scavengerHunts.title,
        questSlug: scavengerHunts.slug,
        partnerName: partners.businessName,
        partnerId: huntSteps.partnerId,
      })
      .from(huntSteps)
      .innerJoin(scavengerHunts, eq(huntSteps.huntId, scavengerHunts.id))
      .leftJoin(partners, eq(huntSteps.partnerId, partners.id))
      .where(eq(huntSteps.id, stepId))
      .limit(1);
    if (!row) return null;

    // Admins short-circuit: a step with no partner attached has no membership
    // to check, and getMembership needs a partner id to resolve at all.
    const isAdmin = roleAtLeast(session.user.role, "admin");
    if (!isAdmin) {
      if (!row.partnerId) return null;
      const membership = await getMembership(
        session.user.id,
        row.partnerId,
        session.user.role
      );
      if (!membership) return null;
    }

    return {
      stepId: row.stepId,
      objectiveTitle: row.objectiveTitle,
      questTitle: row.questTitle,
      questSlug: row.questSlug,
      partnerName: row.partnerName,
    };
  } catch {
    return null;
  }
}
