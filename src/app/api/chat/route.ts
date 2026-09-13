import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { buildSystemMessages } from "@/lib/systemPrompt";
import {
  llmConfigured,
  toolCallSupported,
  streamChatWithTools,
  type LlmMessage,
  type LlmToolCall,
} from "@/lib/llm";
import { executeTool, parseToolArgs } from "@/lib/tools";
import { scheduleMemoryUpdate } from "@/lib/memory";

const MAX_TOOL_TURNS = 3;

/* POST /api/chat  { threadId, message }
 * Persists both sides, streams the reply as plain text. Tool calling
 * follows the Meta cookbook loop: on finish_reason="tool_calls", run
 * each call, append the assistant message + one `tool` message per
 * tool_call_id, and continue — max MAX_TOOL_TURNS turns. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.setupCompleted)
    return NextResponse.json({ error: "setup_required" }, { status: 403 });
  if (!llmConfigured())
    return NextResponse.json({ error: "llm_not_configured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    threadId?: string;
    message?: string;
  } | null;
  const text = body?.message?.trim();
  if (!body?.threadId || !text)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const thread = await prisma.thread.findFirst({
    where: { id: body.threadId, userId: user.id },
    select: { id: true },
  });
  if (!thread)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.message.create({
    data: { threadId: thread.id, role: "user", content: text },
  });

  const history = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const historyMessages: LlmMessage[] = history
    .reverse()
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

  const system = await buildSystemMessages(user.id);
  const llmMessages: LlmMessage[] = [...system, ...historyMessages];

  const tools = toolCallSupported()
    ? (await import("@/lib/tools")).TOOLS
    : undefined;

  const toolCtx = {
    agentName: user.agentName || "Oretha",
    ownerName: user.name,
    ownerWork: user.tagline ?? null,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        // ── The tool loop (Meta cookbook pattern) ──────────────────────
        for (let turn = 0; turn <= MAX_TOOL_TURNS; turn++) {
          let turnText = "";
          let calls: LlmToolCall[] | null = null;

          for await (const ev of streamChatWithTools(llmMessages, tools)) {
            if (ev.type === "text") {
              turnText += ev.delta;
              controller.enqueue(encoder.encode(ev.delta));
            } else {
              calls = ev.calls;
            }
          }

          full += turnText;

          if (!calls || calls.length === 0) break; // plain-text answer — done

          // Append the assistant message carrying the tool_calls…
          llmMessages.push({
            role: "assistant",
            content: turnText,
            tool_calls: calls,
          });

          // …then one `tool` message per call with the matching id.
          for (const call of calls) {
            const result = await executeTool(
              user.id,
              call.name,
              parseToolArgs(call.arguments),
              toolCtx,
            );
            llmMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: result,
            });
          }
          // Loop: the model now sees the results and answers.
        }
      } catch (err) {
        console.error("[chat] stream failed:", err);
        if (!full) {
          controller.enqueue(
            encoder.encode(
              "Something shorted out on my end — try that again.",
            ),
          );
        }
      } finally {
        controller.close();
        if (full.trim()) {
          try {
            await prisma.message.create({
              data: {
                threadId: thread.id,
                role: "assistant",
                content: full,
              },
            });
            await prisma.thread.update({
              where: { id: thread.id },
              data: { updatedAt: new Date() },
            });
            scheduleMemoryUpdate(user.id, [
              { role: "user", content: text },
              { role: "assistant", content: full },
            ]);
          } catch (err) {
            console.error("[chat] post-stream persistence failed:", err);
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-vercel-ai-ui-stream": "v1",
    },
  });
}
