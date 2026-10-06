import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { startAgentTask, parseSteps } from "@/lib/agentTasks";

type Ctx = { params: Promise<{ id: string }> };

const ACTIONS = ["approve", "pause", "resume", "cancel", "retry"] as const;

/* GET /api/agent-tasks/:id — one task (the chat card polls this). */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const task = await prisma.agentTask.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    task: {
      id: task.id,
      status: task.status,
      steps: parseSteps(task.steps),
      currentStep: task.currentStep,
      summary: task.summary,
      lastError: task.lastError,
      updatedAt: task.updatedAt,
    },
  });
}

/* POST /api/agent-tasks/:id — approve / pause / resume / cancel / retry. */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const task = await prisma.agentTask.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action as (typeof ACTIONS)[number];
  if (!action || !ACTIONS.includes(action))
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });

  const terminal = ["complete", "cancelled"];

  if (action === "approve") {
    if (task.status !== "awaiting_approval")
      return NextResponse.json(
        { error: `Task is ${task.status} — only awaiting_approval tasks can be approved.` },
        { status: 409 },
      );
    const updated = await prisma.agentTask.update({
      where: { id },
      data: { status: "running", leaseUntil: null, attempts: 0, lastError: null },
    });
    startAgentTask(updated.id);
    return NextResponse.json({ task: { id, status: "running" } });
  }

  if (action === "pause") {
    if (task.status !== "running")
      return NextResponse.json({ error: `Task is ${task.status} — nothing to pause.` }, { status: 409 });
    // The runner re-reads status between steps and stops on `paused`.
    await prisma.agentTask.update({ where: { id }, data: { status: "paused" } });
    return NextResponse.json({ task: { id, status: "paused" } });
  }

  if (action === "resume") {
    if (task.status !== "paused")
      return NextResponse.json({ error: `Task is ${task.status} — nothing to resume.` }, { status: 409 });
    await prisma.agentTask.update({ where: { id }, data: { status: "running", leaseUntil: null } });
    startAgentTask(id);
    return NextResponse.json({ task: { id, status: "running" } });
  }

  if (action === "cancel") {
    if (terminal.includes(task.status) || task.status === "cancelled")
      return NextResponse.json({ error: `Task is already ${task.status}.` }, { status: 409 });
    await prisma.agentTask.update({
      where: { id },
      data: { status: "cancelled", leaseUntil: null },
    });
    return NextResponse.json({ task: { id, status: "cancelled" } });
  }

  // retry
  if (task.status !== "failed" && task.status !== "cancelled")
    return NextResponse.json(
      { error: `Task is ${task.status} — only failed or cancelled tasks can be retried.` },
      { status: 409 },
    );
  // Reset failed steps back to pending so receipts aren't stale.
  const steps = parseSteps(task.steps).map((s) =>
    s.status === "failed" ? { ...s, status: "pending" as const } : s,
  );
  const updated = await prisma.agentTask.update({
    where: { id },
    data: {
      status: "running",
      steps: JSON.stringify(steps),
      currentStep: 0,
      attempts: 0,
      lastError: null,
      leaseUntil: null,
    },
  });
  startAgentTask(updated.id);
  return NextResponse.json({ task: { id, status: "running" } });
}
