import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  AGENT_TASK_ACTIONS,
  applyAgentTaskAction,
  parseSteps,
  type AgentTaskAction,
} from "@/lib/agentTasks";

type Ctx = { params: Promise<{ id: string }> };

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

/* POST /api/agent-tasks/:id — approve / pause / resume / cancel / retry.
 * Transport only: authorize the row for the caller, validate the action
 * name, then hand the row to the engine's transition table
 * (applyAgentTaskAction). Every refusal is a conflict (409); every
 * success reports the status the engine moved the row to. */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const task = await prisma.agentTask.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action as AgentTaskAction | undefined;
  if (!action || !AGENT_TASK_ACTIONS.includes(action))
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });

  const result = await applyAgentTaskAction(task, action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ task: { id, status: result.status } });
}
