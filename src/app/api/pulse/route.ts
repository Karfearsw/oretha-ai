import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { chatComplete } from "@/lib/llm";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sparkFromDaily(daily: Map<string, number>): number[] {
  const out: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000));
    out.push(daily.get(key) ?? 0);
  }
  return out;
}

function weekDelta(daily: Map<string, number>): number {
  let thisWeek = 0;
  let lastWeek = 0;
  for (let i = 0; i < 7; i++) {
    thisWeek += daily.get(dayKey(new Date(Date.now() - i * 86_400_000))) ?? 0;
    lastWeek += daily.get(dayKey(new Date(Date.now() - (i + 7) * 86_400_000))) ?? 0;
  }
  if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

/* GET /api/pulse — real metrics from the user's activity. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const since = new Date(Date.now() - 14 * 86_400_000);

  const [messages, tasks, runs, emails] = await Promise.all([
    prisma.message.findMany({
      where: { thread: { userId: user.id }, createdAt: { gte: since } },
      select: { createdAt: true, role: true },
    }),
    prisma.task.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      select: { createdAt: true, lane: true },
    }),
    prisma.workflowRun.findMany({
      where: { workflow: { userId: user.id }, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
    prisma.emailMessage.findMany({
      where: { mailbox: { userId: user.id }, receivedAt: { gte: since } },
      select: { receivedAt: true, action: true },
    }),
  ]);

  const userMsgDaily = new Map<string, number>();
  for (const m of messages)
    if (m.role === "user")
      userMsgDaily.set(dayKey(m.createdAt), (userMsgDaily.get(dayKey(m.createdAt)) ?? 0) + 1);

  const taskDaily = new Map<string, number>();
  for (const t of tasks)
    taskDaily.set(dayKey(t.createdAt), (taskDaily.get(dayKey(t.createdAt)) ?? 0) + 1);

  const runDaily = new Map<string, number>();
  for (const r of runs)
    runDaily.set(dayKey(r.createdAt), (runDaily.get(dayKey(r.createdAt)) ?? 0) + 1);

  const mailDaily = new Map<string, number>();
  for (const e of emails)
    mailDaily.set(dayKey(e.receivedAt), (mailDaily.get(dayKey(e.receivedAt)) ?? 0) + 1);

  const completedTasks = tasks.filter((t) => t.lane === "Done").length;

  const metrics = [
    {
      id: "messages",
      label: "MESSAGES SENT",
      value: userMsgDaily.size ? [...userMsgDaily.values()].reduce((a, b) => a + b, 0) : 0,
      spark: sparkFromDaily(userMsgDaily),
      trend: weekDelta(userMsgDaily) >= 0 ? "up" : "down",
      delta: `${weekDelta(userMsgDaily) >= 0 ? "+" : ""}${weekDelta(userMsgDaily)}%`,
    },
    {
      id: "tasks",
      label: "TASKS CREATED",
      value: tasks.length,
      spark: sparkFromDaily(taskDaily),
      trend: weekDelta(taskDaily) >= 0 ? "up" : "down",
      delta: `${weekDelta(taskDaily) >= 0 ? "+" : ""}${weekDelta(taskDaily)}%`,
    },
    {
      id: "workflows",
      label: "AUTOMATION RUNS",
      value: runs.length,
      spark: sparkFromDaily(runDaily),
      trend: weekDelta(runDaily) >= 0 ? "up" : "down",
      delta: `${weekDelta(runDaily) >= 0 ? "+" : ""}${weekDelta(runDaily)}%`,
    },
    {
      id: "mail",
      label: "EMAILS TRIAGED",
      value: emails.length,
      spark: sparkFromDaily(mailDaily),
      trend: weekDelta(mailDaily) >= 0 ? "up" : "down",
      delta: `${weekDelta(mailDaily) >= 0 ? "+" : ""}${weekDelta(mailDaily)}%`,
    },
  ];

  const totalDaily = new Map<string, number>();
  for (const key of new Set([...userMsgDaily.keys(), ...taskDaily.keys(), ...runDaily.keys()])) {
    totalDaily.set(
      key,
      (userMsgDaily.get(key) ?? 0) + (taskDaily.get(key) ?? 0) + (runDaily.get(key) ?? 0),
    );
  }

  // Agent commentary — generated from the user's real numbers. Falls back
  // silently to no notes if the LLM is unavailable.
  let notes: { agent: string; text: string }[] = [];
  try {
    const activity = [
      `messages sent (14d): ${metrics[0].value}`,
      `tasks created (14d): ${tasks.length} (${completedTasks} done)`,
      `automation runs (14d): ${runs.length} (${runs.filter((r) => r.status === "failed").length} failed)`,
      `emails triaged (14d): ${emails.length} (${emails.filter((e) => e.action === "task").length} became tasks)`,
    ].join("\n");
    const raw = await chatComplete(
      [
        {
          role: "system",
          content:
            `You are ${user.agentName || "Oretha"}, chief orchestrator of the user's virtual office. ` +
            "Given the office's real 14-day activity, write 2 status notes from different departments (Ops and one other that matches the data). " +
            'Each note: one or two punchy sentences with a concrete observation and a nudge. Respond with ONLY JSON: [{"agent":"Ops","text":"…"},{"agent":"…","text":"…"}]',
        },
        { role: "user", content: activity },
      ],
      { maxTokens: 250, temperature: 0.6 },
    );
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { agent?: string; text?: string }[];
      notes = parsed
        .filter((n) => n.text)
        .slice(0, 2)
        .map((n) => ({ agent: (n.agent ?? "Ops").slice(0, 24), text: String(n.text).slice(0, 220) }));
    }
  } catch {
    notes = [];
  }

  return NextResponse.json({
    metrics,
    trend: sparkFromDaily(totalDaily),
    trendDelta: weekDelta(totalDaily),
    notes,
    completedTasks,
    failedRuns: runs.filter((r) => r.status === "failed").length,
  });
}
