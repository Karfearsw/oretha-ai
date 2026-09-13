import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { syncAllMailboxes } from "@/lib/mailroom";

/* POST /api/mail/sync — sync + triage all mailboxes for the signed-in user. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.setupCompleted)
    return NextResponse.json({ error: "setup_required" }, { status: 403 });

  const ctx = {
    agentName: user.agentName || "Oretha",
    ownerName: user.name,
    ownerWork: user.tagline ?? null,
  };

  try {
    const results = await syncAllMailboxes(user.id, ctx);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[mail/sync] failed:", err);
    return NextResponse.json(
      { error: "Sync failed. Check the inbox connection and try again." },
      { status: 500 },
    );
  }
}

/* GET /api/mail/sync — mailbox + recent emails for the inbox screen. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const mailboxes = await prisma.mailbox.findMany({
    where: { userId: user.id },
    include: {
      emails: { orderBy: { receivedAt: "desc" }, take: 20 },
    },
  });

  return NextResponse.json({
    mailboxes: mailboxes.map((m) => ({
      id: m.id,
      address: m.address,
      displayName: m.displayName,
      verified: m.verified,
      lastSyncAt: m.lastSyncAt,
      emails: m.emails.map((e) => ({
        id: e.id,
        from: e.fromAddr,
        subject: e.subject,
        preview: e.preview,
        receivedAt: e.receivedAt,
        triaged: e.triaged,
        action: e.action,
        taskTitle: e.taskTitle,
      })),
    })),
  });
}
