import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { buildPreview, needsPreview } from "@/lib/devMode";

async function ownedCodeThread(userId: string, threadId: string) {
  return prisma.thread.findFirst({
    where: { id: threadId, userId },
    select: {
      id: true,
      mode: true,
      repoName: true,
      branchName: true,
      cloudEnv: true,
    },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    threadId?: string;
    message?: string;
  } | null;
  const prompt = body?.message?.trim();
  if (!body?.threadId || !prompt)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const thread = await ownedCodeThread(user.id, body.threadId);
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (thread.mode !== "code")
    return NextResponse.json({ error: "code_mode_required" }, { status: 400 });

  if (!needsPreview(prompt)) {
    return NextResponse.json({ error: "preview_not_required" }, { status: 400 });
  }

  const preview = buildPreview({
    message: prompt,
    repoName: thread.repoName,
    branchName: thread.branchName,
    cloudEnv: thread.cloudEnv,
  });

  const task = await prisma.devTask.create({
    data: {
      userId: user.id,
      threadId: thread.id,
      kind: "preview",
      status: "pending",
      title: preview.title,
      prompt,
      summary: preview.summary,
      plan: preview.plan,
      risks: preview.risks.join("\n"),
      nextStep: preview.nextStep,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      plan: true,
      risks: true,
      nextStep: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    preview: {
      ...task,
      prompt,
      risks: task.risks.split("\n").filter(Boolean),
    },
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    action?: "approve" | "reject";
  } | null;

  if (!body?.id || !body.action)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const existing = await prisma.devTask.findFirst({
    where: { id: body.id, userId: user.id, kind: "preview" },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const status = body.action === "approve" ? "approved" : "rejected";
  const task = await prisma.devTask.update({
    where: { id: body.id },
    data: {
      status,
      approvedAt: body.action === "approve" ? new Date() : null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      plan: true,
      risks: true,
      nextStep: true,
      status: true,
      approvedAt: true,
    },
  });

  return NextResponse.json({
    preview: {
      ...task,
      risks: task.risks.split("\n").filter(Boolean),
    },
  });
}
