import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/* PATCH /api/watches/:id — enable/disable, rename, re-target. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.watch.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    enabled?: boolean;
    name?: string;
    needle?: string;
    threshold?: number;
    schedule?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.name === "string" && body.name.trim())
    data.name = body.name.trim().slice(0, 80);
  if (typeof body.needle === "string") data.needle = body.needle.slice(0, 200);
  if (typeof body.threshold === "number" && Number.isFinite(body.threshold))
    data.threshold = body.threshold;
  if (body.schedule === "hourly" || body.schedule === "daily") data.schedule = body.schedule;
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const watch = await prisma.watch.update({ where: { id }, data });
  return NextResponse.json({ watch: { id: watch.id, enabled: watch.enabled } });
}

/* DELETE /api/watches/:id — remove the watch. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.watch.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.watch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
