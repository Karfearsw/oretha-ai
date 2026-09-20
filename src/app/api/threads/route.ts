import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  defaultBranchForRepo,
  normalizeCloudEnv,
  normalizeMode,
} from "@/lib/devMode";

/* GET /api/threads — the user's threads, newest first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const threads = await prisma.thread.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      mode: true,
      cloudEnv: true,
      repoName: true,
      branchName: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { role: true, content: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      mode: t.mode,
      cloudEnv: t.cloudEnv,
      repoName: t.repoName,
      branchName: t.branchName,
      updatedAt: t.updatedAt,
      preview: t.messages[0]?.content.slice(0, 120) ?? "",
    })),
  });
}

/* POST /api/threads — create a new chat. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    mode?: string;
    cloudEnv?: string;
    repoName?: string;
    branchName?: string;
  } | null;
  const mode = normalizeMode(body?.mode ?? user.defaultMode);
  const repoName = body?.repoName?.trim() || null;
  const branchName =
    body?.branchName?.trim() || defaultBranchForRepo(repoName) || null;
  const cloudEnv = normalizeCloudEnv(body?.cloudEnv);

  const count = await prisma.thread.count({ where: { userId: user.id } });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const thread = await prisma.thread.create({
        data: {
          userId: user.id,
          slug: `t${count + 1 + attempt}`,
          title: mode === "code" ? "New code chat" : "New chat",
          mode,
          cloudEnv,
          repoName,
          branchName,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          mode: true,
          cloudEnv: true,
          repoName: true,
          branchName: true,
        },
      });
      return NextResponse.json({ thread });
    } catch {
      /* slug collision — retry */
    }
  }
  return NextResponse.json({ error: "could_not_create" }, { status: 500 });
}
