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
 * Lease: the transition to `running` and its lease are written in ONE
 * atomic update (`beginAgentTaskRun`), and the API awaits it before
 * responding — so a row can never be observed as `running` with a NULL
 * or stale lease after the response, even if the process freezes before
 * the fire-and-forget runner starts (then the sweeper reclaims it when
 * the lease expires). Every runner write is a compare-and-swap on
 * `status: running` + the exact lease value it holds, so a pause, cancel,
 * or a lease stolen by recovery always beats a runner that wakes up late.
 * `recoverStaleTasks()` reclaims `running` rows whose lease is expired
 * OR NULL (legacy/orned shapes), resuming them or failing them after 3
 * attempts. This is the OpenMuse SQL-lease pattern.
 *
 * This module owns the whole AgentTask contract: the transition table
 * (which action is legal from which status — `applyAgentTaskAction`),
 * the lease, the runner, and recovery. HTTP routes stay thin: they
 * authorize, parse, and map this module's results to status codes.
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

/** Claim a free or expired lease on a `running` row. Returns the lease
 * value we now hold, or null when another worker owns it (or the row
 * isn't running anymore). */
async function claimLease(id: string): Promise<Date | null> {
  const lease = new Date(Date.now() + LEASE_MS);
  const res = await prisma.agentTask.updateMany({
    where: {
      id,
      status: "running",
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
    },
    data: { leaseUntil: lease, attempts: { increment: 1 } },
  });
  return res.count === 1 ? lease : null;
}

/**
 * Atomically move a task into `running` AND establish its lease in the
 * same write. Await this BEFORE the API response returns — that is what
 * closes the freeze window (approve/resume/retry can never commit a
 * `running` + NULL lease). Returns the held lease on success (pass it to
 * `startAgentTask`), or null when `from` no longer matches — a concurrent
 * pause/cancel/retry won and the caller should respond 409.
 */
export async function beginAgentTaskRun(
  id: string,
  from: AgentTaskStatus[],
  extra: { resetAttempts?: boolean; steps?: string; currentStep?: number } = {},
): Promise<Date | null> {
  const lease = new Date(Date.now() + LEASE_MS);
  const res = await prisma.agentTask.updateMany({
    where: { id, status: { in: from } },
    data: {
      status: "running",
      leaseUntil: lease,
      lastError: null,
      ...(extra.resetAttempts ? { attempts: 0 } : {}),
      ...(extra.steps !== undefined ? { steps: extra.steps } : {}),
      ...(extra.currentStep !== undefined ? { currentStep: extra.currentStep } : {}),
    },
  });
  return res.count === 1 ? lease : null;
}

/**
 * Execute a task's remaining steps. Fire-and-forget safe: never throws.
 * `opts.lease` = the caller already established the lease (approve/
 * resume/retry path); otherwise claim a free/expired one (recovery path).
 * Every step write is a compare-and-swap on `status: running` + the held
 * lease value, so pause/cancel/steal beats a runner waking up late.
 */
export async function runAgentTask(
  id: string,
  opts: { lease?: Date } = {},
): Promise<void> {
  const task = await prisma.agentTask.findUnique({ where: { id } });
  if (!task || task.status !== "running") return;
  const held = opts.lease ?? (await claimLease(id));
  if (!held) return; // another worker owns it

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
  let heldLease = held; // renewed with each step; CAS always uses the current value

  for (let i = start; i < steps.length; i++) {
    steps[i].status = "running";
    // Compare-and-swap: if we're no longer `running` with OUR lease
    // (paused, cancelled, or stolen by recovery), stop — their state wins.
    const marked = await prisma.agentTask.updateMany({
      where: { id, status: "running", leaseUntil: heldLease },
      data: { steps: JSON.stringify(steps), currentStep: i },
    });
    if (marked.count !== 1) return;

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
      // Advance + renew the lease in one CAS'd write, then keep holding
      // the new value so a stale copy of this runner can't write anymore.
      const renewed = new Date(Date.now() + LEASE_MS);
      const advanced = await prisma.agentTask.updateMany({
        where: { id, status: "running", leaseUntil: heldLease },
        data: {
          steps: JSON.stringify(steps),
          currentStep: i + 1,
          leaseUntil: renewed,
        },
      });
      if (advanced.count !== 1) return; // cancelled/stolen mid-step
      heldLease = renewed;
    } catch (err) {
      steps[i].status = "failed";
      const message = err instanceof Error ? err.message : "step failed";
      // Only fail the task if we still own it; otherwise the winner's
      // state (paused/cancelled/another runner) must not be overwritten.
      await prisma.agentTask.updateMany({
        where: { id, status: "running", leaseUntil: heldLease },
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
  await prisma.agentTask.updateMany({
    where: { id, status: "running", leaseUntil: heldLease },
    data: { status: "complete", summary, leaseUntil: null, lastError: null },
  });
}

/** Kick off a run (fire-and-forget). Pass `lease` when the caller already
 * established it synchronously (approve/resume/retry); otherwise the
 * runner claims a free/expired lease itself (recovery path). */
export function startAgentTask(id: string, opts: { lease?: Date } = {}): void {
  void runAgentTask(id, opts).catch((err) => {
    console.error("[agentTasks] run failed:", err);
  });
}

/**
 * Reclaim runs whose owner died mid-task: `running` rows whose lease is
 * EXPIRED or NULL (any stale shape — NULL can't match Prisma's `lt`
 * filter, so it must be OR'd explicitly). Resume if attempts remain,
 * else fail honestly. Called by the sweeper.
 */
export async function recoverStaleTasks(): Promise<{ resumed: number; failed: number }> {
  const stale = await prisma.agentTask.findMany({
    where: {
      status: "running",
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
    },
    take: 10,
  });

  let resumed = 0;
  let failed = 0;
  for (const t of stale) {
    if (t.attempts >= MAX_ATTEMPTS) {
      await prisma.agentTask.updateMany({
        where: { id: t.id, status: "running", attempts: { gte: MAX_ATTEMPTS } },
        data: {
          status: "failed",
          lastError: `Interrupted ${t.attempts} times without finishing.`,
          leaseUntil: null,
        },
      });
      failed++;
    } else {
      startAgentTask(t.id); // claimLease takes the free/expired lease
      resumed++;
    }
  }
  return { resumed, failed };
}

/* ── User actions: the transition table ────────────────────────────── */

export const AGENT_TASK_ACTIONS = [
  "approve",
  "pause",
  "resume",
  "cancel",
  "retry",
] as const;

export type AgentTaskAction = (typeof AGENT_TASK_ACTIONS)[number];

export type AgentTaskActionResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

/**
 * Apply a user action to a task the caller has already authorized.
 * This is the single owner of the transition policy: which actions are
 * legal from which status (with the user-facing refusal messages), the
 * atomic begin for approve/resume/retry, and the runner hand-off. Every
 * refusal is a conflict — the HTTP layer maps `{ok:false}` to 409 and
 * `{ok:true}` to 200 with `{task:{id,status}}`.
 */
export async function applyAgentTaskAction(
  task: { id: string; status: string; steps: string },
  action: AgentTaskAction,
): Promise<AgentTaskActionResult> {
  // approve: awaiting_approval → running (lease + runner in one begin).
  if (action === "approve") {
    if (task.status !== "awaiting_approval")
      return {
        ok: false,
        error: `Task is ${task.status} — only awaiting_approval tasks can be approved.`,
      };
    const lease = await beginAgentTaskRun(task.id, ["awaiting_approval"], {
      resetAttempts: true,
    });
    if (!lease) return { ok: false, error: "Task state changed — try again." };
    startAgentTask(task.id, { lease });
    return { ok: true, status: "running" };
  }

  // pause: running → paused; the lease is kept so the runner's next CAS
  // fails and it stops without writing over this state.
  if (action === "pause") {
    if (task.status !== "running")
      return { ok: false, error: `Task is ${task.status} — nothing to pause.` };
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: "paused" } });
    return { ok: true, status: "paused" };
  }

  // resume: paused → running with a fresh lease.
  if (action === "resume") {
    if (task.status !== "paused")
      return { ok: false, error: `Task is ${task.status} — nothing to resume.` };
    const lease = await beginAgentTaskRun(task.id, ["paused"]);
    if (!lease) return { ok: false, error: "Task state changed — try again." };
    startAgentTask(task.id, { lease });
    return { ok: true, status: "running" };
  }

  // cancel: anything non-terminal → cancelled, lease released; the CAS'd
  // runner writes then lose, so this always wins.
  if (action === "cancel") {
    if (task.status === "complete" || task.status === "cancelled")
      return { ok: false, error: `Task is already ${task.status}.` };
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: "cancelled", leaseUntil: null },
    });
    return { ok: true, status: "cancelled" };
  }

  // retry: failed|cancelled → running; failed steps go back to pending so
  // receipts aren't stale, attempts reset, resume from step 0.
  if (task.status !== "failed" && task.status !== "cancelled")
    return {
      ok: false,
      error: `Task is ${task.status} — only failed or cancelled tasks can be retried.`,
    };
  const steps = parseSteps(task.steps).map((s) =>
    s.status === "failed" ? { ...s, status: "pending" as const } : s,
  );
  const lease = await beginAgentTaskRun(task.id, ["failed", "cancelled"], {
    resetAttempts: true,
    steps: JSON.stringify(steps),
    currentStep: 0,
  });
  if (!lease) return { ok: false, error: "Task state changed — try again." };
  startAgentTask(task.id, { lease });
  return { ok: true, status: "running" };
}
