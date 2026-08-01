import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/rbac";
import {
  listChatMessages,
  canAccessChatScope,
  type ChatScope,
} from "@/lib/chat";

/**
 * Incremental chat poll: GET /api/chat/event/<id>?after=<ISO>
 * Returns only messages newer than the cursor — one cheap indexed query.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scopeType: string; scopeId: string }> }
) {
  const session = await auth();
  if (!session?.user || !roleAtLeast(session.user.role, "member")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { scopeType, scopeId } = await params;
  if (scopeType !== "event") {
    return NextResponse.json({ error: "bad scope" }, { status: 400 });
  }
  if (!(await canAccessChatScope(scopeType as ChatScope, scopeId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const after = req.nextUrl.searchParams.get("after") ?? undefined;
  const messages = await listChatMessages(scopeType as ChatScope, scopeId, {
    after,
  });
  return NextResponse.json({ messages });
}
