import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/* POST /api/mail/action  { emailId, action: "task" }
 * Converts an email into a task owned by the mailroom agent card. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    emailId?: string;
    action?: string;
  } | null;

  if (!body?.emailId || body.action !== "task")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const email = await prisma.emailMessage.findFirst({
    where: { id: body.emailId, mailbox: { userId: user.id } },
    include: { mailbox: true },
  });
  if (!email)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const created = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        userId: user.id,
        title: (email.taskTitle ?? `Follow up: ${email.subject}`).slice(0, 160),
        source: "Email",
        lane: "In Progress",
        assigneeId: "mailroom",
        priority: "med",
        due: null,
        emailId: email.id,
      },
    });
    await tx.emailMessage.update({
      where: { id: email.id },
      data: { triaged: true, action: "task", taskTitle: task.title },
    });
    return task;
  });

  return NextResponse.json({ ok: true, task: { id: created.id, title: created.title } });
}
