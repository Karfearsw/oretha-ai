/* ── Workflow scheduler: real automations ──────────────────────────────
 * The sweep finds every enabled workflow whose schedule is due and
 * executes it, recording a WorkflowRun with a real summary.
 *
 * Actions:
 *   mail_triage   → syncAllMailboxes() (AgentMail → LLM triage → tasks)
 *   custom_prompt → chatComplete() with the user's agent files as context
 *
 * Triggers:
 *   - local dev: instrumentation.ts starts an interval sweeper
 *   - production: vercel.json cron → GET /api/cron/sweep (CRON_SECRET)
 */

import { prisma } from "@/lib/prisma";
import { chatComplete } from "@/lib/llm";
import { buildSystemMessages } from "@/lib/systemPrompt";
import { syncAllMailboxes } from "@/lib/mailroom";
import { syncAllConnectors } from "@/lib/connectors";

const SCHEDULE_MS: Record<string, number> = {
  hourly: 3600_000,
  daily: 86_400_000,
  weekly: 604_800_000,
};

export function isDue(lastRunAt: Date | null, schedule: string): boolean {
  if (!lastRunAt) return true;
  const interval = SCHEDULE_MS[schedule] ?? SCHEDULE_MS.daily;
  return Date.now() - lastRunAt.getTime() >= interval;
}

async function runWorkflow(
  workflow: { id: string; userId: string; action: string; prompt: string | null },
  ctx: { agentName: string; ownerName: string },
): Promise<string> {
  if (workflow.action === "mail_triage") {
    const results = await syncAllMailboxes(workflow.userId, {
      agentName: ctx.agentName,
      ownerName: ctx.ownerName,
      ownerWork: null,
    });
    if (results.length === 0)
      return "No inbox connected — nothing to triage. Connect one in KEVO Office → Inbox.";
    const fetched = results.reduce((n, r) => n + r.fetched, 0);
    const tasks = results.reduce((n, r) => n + r.tasks, 0);
    return `Swept ${results.length} inbox${results.length === 1 ? "" : "es"}: ${fetched} new email${fetched === 1 ? "" : "s"}, ${tasks} task${tasks === 1 ? "" : "s"} landed on the board.`;
  }

  if (workflow.action === "connector_sync") {
    const results = await syncAllConnectors(workflow.userId);
    if (results.length === 0)
      return "No connectors linked — add GitHub or Linear in Settings → Connectors.";
    const created = results.reduce((n, r) => n + r.created, 0);
    const parts = results.map(
      (r) => `${r.kind}${r.error ? ` (error: ${r.error})` : `: +${r.created}`}`,
    );
    return `Connector sweep — ${created} new task${created === 1 ? "" : "s"}. ${parts.join(" · ")}`;
  }

  if (workflow.action === "custom_prompt" && workflow.prompt?.trim()) {
    const system = await buildSystemMessages(workflow.userId);
    const answer = await chatComplete(
      [
        ...system,
        {
          role: "user",
          content: `Scheduled workflow "${workflow.prompt.trim()}". Do the work and answer concisely — this runs without the user watching.`,
        },
      ],
      { maxTokens: 700, temperature: 0.4, userId: workflow.userId },
    );
    return answer.slice(0, 600);
  }

  return "Nothing to do — this workflow has no action configured.";
}

/**
 * Execute one workflow immediately (Run now button + sweep share this).
 * Creates the run row, executes, then marks complete/failed with a real
 * summary. Returns the finished run.
 */
export async function executeWorkflow(workflowId: string, userId: string) {
  const wf = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
  });
  if (!wf) throw new Error("not_found");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, agentName: true },
  });

  const run = await prisma.workflowRun.create({
    data: { workflowId: wf.id, status: "running" },
  });

  try {
    const summary = await runWorkflow(wf, {
      agentName: user?.agentName || "Oretha",
      ownerName: user?.name || "the team",
    });
    const finished = await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "complete", summary },
    });
    await prisma.workflow.update({
      where: { id: wf.id },
      data: { lastRunAt: new Date() },
    });
    return finished;
  } catch (err) {
    const message = err instanceof Error ? err.message : "workflow failed";
    return prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "failed", summary: message.slice(0, 600) },
    });
  }
}

export interface SweepResult {
  checked: number;
  executed: number;
  results: { workflow: string; status: string }[];
}

/**
 * Sweep all users' due workflows. Called by the cron endpoint and the
 * local interval sweeper. Never throws — errors land in the run rows.
 */
export async function sweepDueWorkflows(): Promise<SweepResult> {
  const due = await prisma.workflow.findMany({
    where: { enabled: true },
    include: { user: { select: { name: true, agentName: true } } },
  });

  const results: SweepResult = { checked: due.length, executed: 0, results: [] };

  for (const wf of due) {
    if (!isDue(wf.lastRunAt, wf.schedule)) continue;
    results.executed++;
    try {
      const run = await executeWorkflow(wf.id, wf.userId);
      results.results.push({
        workflow: wf.name,
        status: run?.status ?? "failed",
      });
    } catch (err) {
      results.results.push({
        workflow: wf.name,
        status: err instanceof Error ? err.message.slice(0, 80) : "failed",
      });
    }
  }

  return results;
}
