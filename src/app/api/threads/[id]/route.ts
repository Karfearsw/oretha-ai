import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function ownedThread(userId: string, id: string) {
  return prisma.thread.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

/* PATCH /api/threads/:id — rename a chat. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await ownedThread(user.id, id)))
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const title = body?.title?.trim();
  if (!title) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const thread = await prisma.thread.update({
    where: { id },
    data: { title: title.slice(0, 120) },
    select: { id: true, title: true },
  });
  return NextResponse.json({ thread });
}

/* DELETE /api/threads/:id            — delete the whole chat.
 * DELETE /api/threads/:id?messages=1 — clear the conversation, keep the chat. */
export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await ownedThread(user.id, id)))
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const clearOnly = new URL(req.url).searchParams.get("messages") === "1";
  if (clearOnly) {
    await prisma.message.deleteMany({ where: { threadId: id } });
    return NextResponse.json({ ok: true, cleared: true });
  }

  await prisma.thread.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
