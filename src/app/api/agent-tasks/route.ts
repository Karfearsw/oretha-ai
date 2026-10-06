import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAgentTask, parseSteps } from "@/lib/agentTasks";

/* Shape sent to the client — steps parsed, not raw JSON. */
function shape(t: {
  id: string;
  threadId: string | null;
  title: string;
  goal: string;
  status: string;
  steps: string;
  currentStep: number;
  summary: string;
  lastError: string | null;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}) {
  return {
    id: t.id,
    threadId: t.threadId,
    title: t.title,
    goal: t.goal,
    status: t.status,
    steps: parseSteps(t.steps),
    currentStep: t.currentStep,
    summary: t.summary,
    lastError: t.lastError,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/* GET /api/agent-tasks — the user's delegated tasks (newest first). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tasks = await prisma.agentTask.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ tasks: tasks.map(shape) });
}

/* POST /api/agent-tasks — create a delegated task (plans immediately). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.setupCompleted)
    return NextResponse.json({ error: "setup_required" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    goal?: string;
    threadId?: string;
  } | null;

  if (!body?.title?.trim() || !body?.goal?.trim())
    return NextResponse.json(
      { error: "A delegated task needs a title and a goal." },
      { status: 400 },
    );

  try {
    const task = await createAgentTask(user.id, {
      title: body.title,
      goal: body.goal,
      threadId: body.threadId ?? null,
    });
    return NextResponse.json({ task: shape(task) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "couldn't create the task" },
      { status: 400 },
    );
  }
}
