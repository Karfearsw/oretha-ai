import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/* GET /api/threads/[id]/messages — full history for one thread. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const thread = await prisma.thread.findFirst({
    where: { id, userId: user.id },
    select: { id: true, title: true },
  });
  if (!thread)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ thread, messages });
}
