/* ── Chat tools (OpenAI/Meta function-calling pattern) ─────────────────
 * The model sees tool schemas; when it returns finish_reason="tool_calls",
 * the chat route executes each call here and feeds results back as `tool`
 * messages, looping until the model answers in plain text.
 *
 * Tools:
 *  - check_mail:       syncs the user's AgentMail inbox, triages new email
 *                      (LLM verdict per email), returns a summary.
 *  - list_tasks:       returns the user's current Task board rows.
 *  - sync_connectors:  pulls assigned GitHub issues/PRs and Linear issues
 *                      onto the board.
 *  - read_page:        fetches a public URL and returns readable text.
 *  - web_search:       best-effort keyless web search (DuckDuckGo HTML).
 *  - create_watch:     creates a page watch (change / text / price).
 *  - delegate_task:    creates a delegated agent task with a plan.
 *
 * Every branch returns a JSON string — the model never sees a thrown error.
 */

import { prisma } from "@/lib/prisma";
import { syncAllMailboxes } from "@/lib/mailroom";
import { syncAllConnectors } from "@/lib/connectors";
import { fetchPage, validateUrl } from "@/lib/pageFetch";
import { createWatch } from "@/lib/watches";
import { createAgentTask } from "@/lib/agentTasks";
import { searchWeb } from "@/lib/webSearch";

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
  {
    type: "function",
    function: {
      name: "read_page",
      description:
        "Fetch a public web page by URL and return its readable text (title + body, stripped of HTML). Use when the user shares a link or asks what a page says. Private/local addresses are blocked.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Full http(s) URL of the page to read.",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Best-effort web search: returns top results (title, URL, snippet) for a query. Use when the user asks to look something up online. May be unavailable — say so plainly if it is.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_watch",
      description:
        "Create a recurring watch on a public page. kind='change' alerts when the page content changes, kind='text' alerts when specific text appears, kind='price' alerts when a USD price on the page drops to or below threshold. Alerts land on the task board.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name for the watch." },
          url: { type: "string", description: "Full http(s) URL to watch." },
          kind: {
            type: "string",
            enum: ["change", "text", "price"],
            description: "What to watch for.",
          },
          needle: {
            type: "string",
            description: "Text to look for (kind='text').",
          },
          threshold: {
            type: "number",
            description: "Alert when price ≤ this (kind='price'), in USD.",
          },
          schedule: {
            type: "string",
            enum: ["hourly", "daily"],
            description: "Check frequency. Defaults to daily.",
          },
        },
        required: ["name", "url", "kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_task",
      description:
        "Create a delegated background task with a step-by-step plan. The plan waits for the user's approval before it runs — present the steps and tell them where to approve (chat card or Office → Activity).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title." },
          goal: {
            type: "string",
            description: "What the task should accomplish, in detail.",
          },
        },
        required: ["title", "goal"],
      },
    },
  },
];

/** Execute a tool call by name. Always returns a JSON string for the model. */
export async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
  ctx: {
    agentName: string;
    ownerName: string;
    ownerWork: string | null;
    threadId?: string | null;
  },
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

    if (name === "read_page") {
      const url = typeof args.url === "string" ? args.url.trim() : "";
      if (!url)
        return JSON.stringify({ status: "bad_request", message: "Missing url." });
      const blocked = validateUrl(url);
      if (blocked) return JSON.stringify({ status: "blocked", message: blocked });
      const page = await fetchPage(url);
      if (!page.ok)
        return JSON.stringify({
          status: page.status ? "http_error" : "fetch_failed",
          url: page.url,
          status_code: page.status,
          message: page.error,
        });
      return JSON.stringify({
        status: "ok",
        url: page.url,
        title: page.title,
        // The model reads text directly; length kept in check by pageFetch.
        text: page.text,
      });
    }

    if (name === "web_search") {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query)
        return JSON.stringify({ status: "bad_request", message: "Missing query." });
      const results = await searchWeb(query);
      if (results.length === 0)
        return JSON.stringify({
          status: "unavailable",
          message:
            "Search returned no results or the provider was unreachable — tell the user you couldn't search right now.",
        });
      return JSON.stringify({ status: "ok", results });
    }

    if (name === "create_watch") {
      const kind =
        args.kind === "text" || args.kind === "price" ? args.kind : "change";
      const outcome = await createWatch(userId, {
        name: typeof args.name === "string" ? args.name : "",
        url: typeof args.url === "string" ? args.url : "",
        kind,
        needle: typeof args.needle === "string" ? args.needle : null,
        threshold:
          typeof args.threshold === "number" && Number.isFinite(args.threshold)
            ? args.threshold
            : null,
        schedule: args.schedule === "hourly" ? "hourly" : "daily",
      });
      if ("error" in outcome)
        return JSON.stringify({ status: "error", message: outcome.error });
      return JSON.stringify({
        status: "created",
        watch: { id: outcome.id, name: outcome.name, kind: outcome.kind },
        message:
          "Watch created — it will check on schedule and drop alerts on the task board.",
      });
    }

    if (name === "delegate_task") {
      const title = typeof args.title === "string" ? args.title.trim() : "";
      const goal = typeof args.goal === "string" ? args.goal.trim() : "";
      if (!title || !goal)
        return JSON.stringify({
          status: "bad_request",
          message: "Both title and goal are required.",
        });
      const task = await createAgentTask(userId, {
        title,
        goal,
        threadId: ctx.threadId ?? null,
      });
      return JSON.stringify({
        status: "awaiting_approval",
        task: { id: task.id, title: task.title, steps: task.steps },
        message:
          "Delegated task created with a plan. Present the steps and tell the user to approve it in the chat card or Office → Activity.",
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
