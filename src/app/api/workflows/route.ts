import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const ACTIONS = ["mail_triage", "connector_sync", "custom_prompt"] as const;
const SCHEDULES = ["hourly", "daily", "weekly"] as const;
const MAX_WORKFLOWS = 20;

/* GET /api/workflows — the user's workflows + last run each. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    workflows: workflows.map((w) => ({
      id: w.id,
      name: w.name,
      action: w.action,
      prompt: w.prompt,
      schedule: w.schedule,
      enabled: w.enabled,
      lastRunAt: w.lastRunAt,
      lastRun: w.runs[0]
        ? { status: w.runs[0].status, summary: w.runs[0].summary, at: w.runs[0].createdAt }
        : null,
    })),
  });
}

/* POST /api/workflows — create a workflow. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.setupCompleted)
    return NextResponse.json({ error: "setup_required" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    action?: string;
    prompt?: string;
    schedule?: string;
  } | null;

  const name = body?.name?.trim().slice(0, 80);
  const action = body?.action as (typeof ACTIONS)[number];
  const schedule = body?.schedule as (typeof SCHEDULES)[number];
  const prompt = body?.prompt?.trim().slice(0, 600) ?? null;

  if (!name) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
  if (!action || !ACTIONS.includes(action))
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (!schedule || !SCHEDULES.includes(schedule))
    return NextResponse.json({ error: "Unknown schedule." }, { status: 400 });
  if (action === "custom_prompt" && !prompt)
    return NextResponse.json(
      { error: "Custom prompts need, well, a prompt." },
      { status: 400 },
    );

  const count = await prisma.workflow.count({ where: { userId: user.id } });
  if (count >= MAX_WORKFLOWS)
    return NextResponse.json(
      { error: `Workflow cap reached (${MAX_WORKFLOWS}). Delete one first.` },
      { status: 400 },
    );

  const workflow = await prisma.workflow.create({
    data: { userId: user.id, name, action, prompt, schedule },
  });

  return NextResponse.json({ workflow: { id: workflow.id, name: workflow.name } });
}
