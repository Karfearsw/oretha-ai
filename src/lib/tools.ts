/* ── Chat tools (OpenAI/Meta function-calling pattern) ─────────────────
 * The model sees tool schemas; when it returns finish_reason="tool_calls",
 * the chat route executes each call here and feeds results back as `tool`
 * messages, looping until the model answers in plain text.
 *
 * Three tools:
 *  - check_mail:       syncs the user's AgentMail inbox, triages new email
 *                      (LLM verdict per email), returns a summary.
 *  - list_tasks:       returns the user's current Task board rows.
 *  - sync_connectors:  pulls assigned GitHub issues/PRs and Linear issues
 *                      onto the board.
 */

import { prisma } from "@/lib/prisma";
import { syncAllMailboxes } from "@/lib/mailroom";
import { syncAllConnectors } from "@/lib/connectors";

export interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export const TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "check_mail",
      description:
        "Sync the user's AgentMail inbox, triage new emails (task / reply / archive), and return a summary of what landed. Use when the user asks about mail, the inbox, or new email.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "List the user's current task board rows (title, lane, priority, due, assignee). Use when the user asks what's on the board.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "sync_connectors",
      description:
        "Pull the user's assigned work from connected services (GitHub issues and review-requested PRs, Linear issues) onto the task board. Use when the user asks to check GitHub/Linear, sync connectors, or update the board from external tools.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

/** Execute a tool call by name. Always returns a JSON string for the model. */
export async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
  ctx: { agentName: string; ownerName: string; ownerWork: string | null },
): Promise<string> {
  try {
    if (name === "check_mail") {
      const results = await syncAllMailboxes(userId, ctx);
      if (results.length === 0) {
        return JSON.stringify({
          status: "no_inbox",
          message:
            "No inbox is connected yet — the user can connect one in KEVO Office.",
        });
      }
      return JSON.stringify({
        status: "ok",
        mailboxes: results.map((r) => ({
          inbox: r.inboxId,
          fetched: r.fetched,
          triaged: r.triaged,
          tasks_created: r.tasks,
          ...(r.error ? { error: r.error } : {}),
        })),
      });
    }

    if (name === "list_tasks") {
      const tasks = await prisma.task.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 15,
      });
      return JSON.stringify({
        tasks: tasks.map((t) => ({
          title: t.title,
          lane: t.lane,
          source: t.source,
          priority: t.priority,
          due: t.due,
          assignee: t.assigneeId,
        })),
      });
    }

    if (name === "sync_connectors") {
      const results = await syncAllConnectors(userId);
      if (results.length === 0) {
        return JSON.stringify({
          status: "no_connectors",
          message:
            "No connectors are linked yet — GitHub or Linear can be connected in Settings → Connectors.",
        });
      }
      return JSON.stringify({
        status: "ok",
        connectors: results.map((r) => ({
          kind: r.kind,
          created: r.created,
          ...(r.error ? { error: r.error } : {}),
        })),
      });
    }

    return JSON.stringify({ status: "unknown_tool", tool: name });
  } catch (err) {
    return JSON.stringify({
      status: "error",
      message: err instanceof Error ? err.message : "tool failed",
    });
  }
}

/** Safe argument parse — bad JSON becomes an empty object the model can retry. */
export function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
