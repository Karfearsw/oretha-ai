import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/* GET /api/runs/recent — the user's latest workflow runs (running first). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const runs = await prisma.workflowRun.findMany({
    where: { workflow: { userId: user.id } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 6,
    include: { workflow: { select: { name: true, action: true } } },
  });

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      workflow: r.workflow.name,
      action: r.workflow.action,
      status: r.status,
      summary: r.summary,
      at: r.createdAt,
    })),
  });
}
