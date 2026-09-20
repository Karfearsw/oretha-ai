import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  branchesForRepo,
  normalizeCloudEnv,
  normalizeMode,
} from "@/lib/devMode";

type Ctx = { params: Promise<{ id: string }> };

async function ownedThread(userId: string, id: string) {
  return prisma.thread.findFirst({
    where: { id, userId },
    select: { id: true, mode: true, repoName: true },
  });
}

/* PATCH /api/threads/:id — rename a chat or update mode context. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await ownedThread(user.id, id);
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    mode?: string;
    cloudEnv?: string;
    repoName?: string | null;
    branchName?: string | null;
  } | null;
  const data: {
    title?: string;
    mode?: string;
    cloudEnv?: string;
    repoName?: string | null;
    branchName?: string | null;
  } = {};

  if (typeof body?.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 120);
  }

  if (typeof body?.mode === "string") {
    data.mode = normalizeMode(body.mode);
  }

  if (typeof body?.cloudEnv === "string") {
    data.cloudEnv = normalizeCloudEnv(body.cloudEnv);
  }

  if (body && "repoName" in body) {
    data.repoName = body.repoName?.trim() || null;
    const allowedBranches = branchesForRepo(data.repoName ?? existing.repoName);
    if (!body.branchName && allowedBranches.length > 0) {
      data.branchName = allowedBranches[0];
    }
  }

  if (body && "branchName" in body) {
    data.branchName = body.branchName?.trim() || null;
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const thread = await prisma.thread.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      mode: true,
      cloudEnv: true,
      repoName: true,
      branchName: true,
    },
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
