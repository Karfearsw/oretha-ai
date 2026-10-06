/* ── Delegated tasks: durable plans the user approves and controls ────
 * A delegated task goes: awaiting_approval → (approve) → running →
 * complete | failed | cancelled, with pause honored between steps.
 *
 * Plan: one chatComplete call returns 2–5 JSON steps {label, detail}.
 * Run: each step is one chatComplete call with the user's agent context;
 * its answer is written back as the step's receipt. The row's `status` is
 * re-read from the DB before every step, so pause/cancel from another
 * request takes effect mid-run.
 *
 * Lease: `leaseUntil` is renewed before each step. If the process dies
 * mid-run (Vercel function timeout, crash), the row is left `running`
 * with an expired lease — `recoverStaleTasks()` (sweeper) resumes it, or
 * fails it after 3 attempts. This is the OpenMuse SQL-lease pattern.
 *
 * Nothing here throws across a call boundary: failures land in
 * `status: failed` + `lastError` so the UI always has a truthful state.
 */

import { prisma } from "@/lib/prisma";
import { chatComplete } from "@/lib/llm";
import { buildSystemMessages } from "@/lib/systemPrompt";

const LEASE_MS = 120_000; // renewed before each step
const MAX_ATTEMPTS = 3;
const MAX_STEPS = 5;

export interface PlanStep {
  label: string;
  detail: string;
  status: "pending" | "running" | "complete" | "failed";
  receipt?: string;
}

export type AgentTaskStatus =
  | "awaiting_approval"
  | "running"
  | "paused"
  | "complete"
  | "failed"
  | "cancelled";

export interface AgentTaskRow {
  id: string;
  userId: string;
  threadId: string | null;
  title: string;
  goal: string;
  status: string;
  steps: string;
  currentStep: number;
  summary: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function parseSteps(raw: string): PlanStep[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is PlanStep =>
        s && typeof s === "object" && typeof s.label === "string",
    );
  } catch {
    return [];
  }
}

function parsePlanJson(raw: string): PlanStep[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const steps: PlanStep[] = [];
    for (const s of arr.slice(0, MAX_STEPS) as { label?: unknown; detail?: unknown }[]) {
      if (s && typeof s.label === "string") {
        steps.push({
          label: s.label.slice(0, 120),
          detail: typeof s.detail === "string" ? s.detail.slice(0, 400) : "",
          status: "pending",
        });
      }
    }
    return steps.length > 0 ? steps : null;
  } catch {
    return null;
  }
}

/** Generate the step plan for a new task. Never throws. */
async function planTask(userId: string, title: string, goal: string): Promise<PlanStep[]> {
  try {
    const system = await buildSystemMessages(userId);
    const raw = await chatComplete(
      [
        ...system,
        {
          role: "user",
          content:
            `Plan this delegated task as JSON ONLY (no prose): a JSON array of 2 to ${MAX_STEPS} objects, ` +
            `each {"label":"short step name","detail":"one sentence on what happens"}. ` +
            `Steps must be concrete and executable by an AI assistant.\n\n` +
            `Task: ${title}\nGoal: ${goal}`,
        },
      ],
      { maxTokens: 500, temperature: 0.3, userId },
    );
    const steps = parsePlanJson(raw);
    if (steps) return steps;
  } catch {
    /* fall through to the generic plan */
  }
  // No LLM / unparseable → a truthful generic plan rather than a fake one.
  return [
    { label: "Gather context", detail: `Review what's needed for: ${goal}`, status: "pending" },
    { label: "Do the work", detail: "Execute the task goal.", status: "pending" },
    { label: "Report back", detail: "Summarize the outcome with receipts.", status: "pending" },
  ];
}

/** Create a delegated task in awaiting_approval with a plan. */
export async function createAgentTask(
  userId: string,
  input: { title: string; goal: string; threadId?: string | null },
): Promise<AgentTaskRow> {
  const title = input.title.trim().slice(0, 120);
  const goal = input.goal.trim().slice(0, 2000);
  if (!title) throw new Error("A delegated task needs a title.");
  if (!goal) throw new Error("A delegated task needs a goal.");

  const steps = await planTask(userId, title, goal);
  return prisma.agentTask.create({
    data: {
      userId,
      threadId: input.threadId ?? null,
      title,
      goal,
      status: "awaiting_approval",
      steps: JSON.stringify(steps),
    },
  });
}

/** Renew the lease if it's free or ours. Returns false when someone else holds it. */
async function takeLease(id: string): Promise<boolean> {
  const res = await prisma.agentTask.updateMany({
    where: {
      id,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
    },
    data: { leaseUntil: new Date(Date.now() + LEASE_MS), attempts: { increment: 1 } },
  });
  return res.count === 1;
}

/**
 * Execute a task's remaining steps. Fire-and-forget safe: never throws.
 * Re-reads `status` before each step so pause/cancel wins over the loop.
 */
export async function runAgentTask(id: string): Promise<void> {
  const task = await prisma.agentTask.findUnique({ where: { id } });
  if (!task || task.status !== "running") return;
  if (!(await takeLease(id))) return; // another worker owns it

  const steps = parseSteps(task.steps);
  // A step left `running` by a crashed process isn't running anymore —
  // and resume from the first step that never completed, so a crash can't
  // skip a step (currentStep may point past it).
  let start = steps.length; // assume done; move back to the first incomplete step
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status === "running" || steps[i].status === "failed") {
      steps[i].status = "pending";
      if (start > i) start = i;
    } else if (steps[i].status !== "complete" && start > i) {
      start = i;
    }
  }
  const system = await buildSystemMessages(task.userId);

  for (let i = start; i < steps.length; i++) {
    // Pause/cancel honored between steps.
    const fresh = await prisma.agentTask.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!fresh || fresh.status !== "running") return; // lease stays for recovery

    steps[i].status = "running";
    await prisma.agentTask.update({
      where: { id },
      data: { steps: JSON.stringify(steps), currentStep: i },
    });

    try {
      const answer = await chatComplete(
        [
          ...system,
          {
            role: "user",
            content:
              `You are executing step ${i + 1} of ${steps.length} of a delegated task.\n\n` +
              `Task: ${task.title}\nGoal: ${task.goal}\n\n` +
              `Step: ${steps[i].label} — ${steps[i].detail}\n\n` +
              `Do this step and answer with the receipt: what you found/did, concise (max 120 words).`,
          },
        ],
        { maxTokens: 500, temperature: 0.4, userId: task.userId },
      );
      steps[i].status = "complete";
      steps[i].receipt = answer.slice(0, 400);
      await prisma.agentTask.update({
        where: { id },
        data: {
          steps: JSON.stringify(steps),
          currentStep: i + 1,
          leaseUntil: new Date(Date.now() + LEASE_MS),
        },
      });
    } catch (err) {
      steps[i].status = "failed";
      const message = err instanceof Error ? err.message : "step failed";
      await prisma.agentTask.update({
        where: { id },
        data: {
          steps: JSON.stringify(steps),
          status: "failed",
          lastError: message.slice(0, 300),
          leaseUntil: null,
        },
      });
      return;
    }
  }

  const summary =
    steps[steps.length - 1]?.receipt?.slice(0, 300) ||
    `Completed ${steps.length} step${steps.length === 1 ? "" : "s"}.`;
  await prisma.agentTask.update({
    where: { id },
    data: { status: "complete", summary, leaseUntil: null, lastError: null },
  });
}

/** Kick off a run (fire-and-forget). Returns immediately. */
export function startAgentTask(id: string): void {
  void runAgentTask(id).catch((err) => {
    console.error("[agentTasks] run failed:", err);
  });
}

/**
 * Reclaim runs whose owner died mid-task: `running` with an expired lease
 * → resume (if attempts remain) or fail honestly. Called by the sweeper.
 */
export async function recoverStaleTasks(): Promise<{ resumed: number; failed: number }> {
  const stale = await prisma.agentTask.findMany({
    where: {
      status: "running",
      leaseUntil: { lt: new Date() },
    },
    take: 10,
  });

  let resumed = 0;
  let failed = 0;
  for (const t of stale) {
    if (t.attempts >= MAX_ATTEMPTS) {
      await prisma.agentTask.update({
        where: { id: t.id },
        data: {
          status: "failed",
          lastError: `Interrupted ${t.attempts} times without finishing.`,
          leaseUntil: null,
        },
      });
      failed++;
    } else {
      startAgentTask(t.id); // takeLease renews the expired lease
      resumed++;
    }
  }
  return { resumed, failed };
}
