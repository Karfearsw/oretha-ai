import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/* GET /api/tasks — the user's real task board rows (email triage, etc.). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      source: t.source,
      lane: t.lane,
      assigneeId: t.assigneeId,
      priority: t.priority,
      due: t.due,
      overdue: false,
    })),
  });
}
