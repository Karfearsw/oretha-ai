import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { llmConfigured, type LlmMessage } from "@/lib/llm";
import { updateMemory } from "@/lib/memory";

/* POST /api/memory/update  { threadId }
 * Extracts durable facts from the thread's recent messages and merges
 * them into MEMORY.md. Called fire-and-forget by the chat route after
 * each exchange; also callable directly. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!llmConfigured())
    return NextResponse.json({ error: "llm_not_configured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    threadId?: string;
  } | null;
  if (!body?.threadId)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const thread = await prisma.thread.findFirst({
    where: { id: body.threadId, userId: user.id },
    select: { id: true },
  });
  if (!thread)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const recent = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (recent.length === 0)
    return NextResponse.json({ ok: true, updated: false, reason: "empty" });

  const exchange: LlmMessage[] = recent
    .reverse()
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

  try {
    await updateMemory(user.id, exchange);
    return NextResponse.json({ ok: true, updated: true });
  } catch (err) {
    console.error("[memory] update failed:", err);
    return NextResponse.json({ error: "memory_update_failed" }, { status: 500 });
  }
}
