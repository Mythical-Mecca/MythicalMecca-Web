import "server-only";
import { db } from "@/lib/db";
import { chatMessages, events, users } from "@/lib/db/schema";
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { PUBLIC_EVENT_STATUSES } from "@/lib/content";

const useDb = !!process.env.DATABASE_URL;

/**
 * Chat is scoped by (type, id). Events are the only chattable thing today; the
 * discriminator stays so another scope can be added without a new table.
 */
export type ChatScope = "event";

export interface ChatMessageView {
  id: string;
  userId: string;
  author: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

/** Members-only access; scope must resolve to a real, visible entity. */
export async function canAccessChatScope(
  scopeType: ChatScope,
  scopeId: string
): Promise<boolean> {
  if (!useDb || scopeType !== "event") return false;
  try {
    const [row] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.id, scopeId),
          inArray(events.status, [...PUBLIC_EVENT_STATUSES])
        )
      )
      .limit(1);
    return !!row;
  } catch {
    return false;
  }
}

export async function listChatMessages(
  scopeType: ChatScope,
  scopeId: string,
  opts?: { after?: string; limit?: number }
): Promise<ChatMessageView[]> {
  if (!useDb) return [];
  try {
    const conds = [
      eq(chatMessages.scopeType, scopeType),
      eq(chatMessages.scopeId, scopeId),
      isNull(chatMessages.deletedAt),
    ];
    if (opts?.after) {
      const after = new Date(opts.after);
      if (!isNaN(after.getTime())) conds.push(gt(chatMessages.createdAt, after));
    }
    const rows = await db
      .select({ m: chatMessages, author: users.name, avatarUrl: users.avatarUrl })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(and(...conds))
      .orderBy(asc(chatMessages.createdAt))
      .limit(Math.min(opts?.limit ?? 200, 500));
    return rows.map(({ m, author, avatarUrl }) => ({
      id: m.id,
      userId: m.userId,
      author: author ?? "Adventurer",
      avatarUrl,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
