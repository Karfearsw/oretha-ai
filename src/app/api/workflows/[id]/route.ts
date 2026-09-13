import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { executeWorkflow } from "@/lib/scheduler";

type Ctx = { params: Promise<{ id: string }> };

/* PATCH /api/workflows/:id — toggle enabled. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { enabled?: boolean } | null;
  if (typeof body?.enabled !== "boolean")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const existing = await prisma.workflow.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const workflow = await prisma.workflow.update({
    where: { id },
    data: { enabled: body.enabled },
  });
  return NextResponse.json({ workflow: { id: workflow.id, enabled: workflow.enabled } });
}

/* DELETE /api/workflows/:id — remove the workflow (runs cascade). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.workflow.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/* POST /api/workflows/:id — run it now. */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.workflow.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const run = await executeWorkflow(id, user.id);
  return NextResponse.json({
    run: { id: run.id, status: run.status, summary: run.summary },
  });
}
