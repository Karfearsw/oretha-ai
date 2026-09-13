import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  amValidateKey,
  amVerifyKey,
  amCreateInbox,
  encryptSecret,
} from "@/lib/agentmail";

/* POST /api/mail/connect  { apiKey: "am_…" }
 * Validates the key with AgentMail, provisions the agent's OWN inbox
 * (idempotent via client_id), stores the key AES-256-GCM-encrypted, and
 * returns the new address. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { apiKey?: string } | null;
  const apiKey = body?.apiKey?.trim() ?? "";
  if (!amValidateKey(apiKey))
    return NextResponse.json(
      { error: "That doesn't look like an AgentMail key — expected am_…" },
      { status: 400 },
    );

  // Smoke-test the key against the live API before storing anything.
  const ok = await amVerifyKey(apiKey);
  if (!ok)
    return NextResponse.json(
      { error: "AgentMail rejected that key. Check it and try again." },
      { status: 400 },
    );

  try {
    // Idempotent per user: retrying never creates duplicate inboxes.
    const inbox = await amCreateInbox(apiKey, {
      displayName: `${user.agentName} Mailroom`,
      clientId: `oretha-inbox-${user.id}`,
    });

    const existing = await prisma.mailbox.findUnique({
      where: { userId_inboxId: { userId: user.id, inboxId: inbox.inboxId } },
      select: { id: true },
    });

    const data = {
      ...encryptSecret(apiKey),
      address: inbox.address,
      displayName: inbox.displayName,
    };

    const mailbox = existing
      ? await prisma.mailbox.update({ where: { id: existing.id }, data })
      : await prisma.mailbox.create({
          data: { userId: user.id, inboxId: inbox.inboxId, ...data },
        });

    return NextResponse.json({
      ok: true,
      address: mailbox.address,
      inboxId: mailbox.inboxId,
    });
  } catch (err) {
    console.error("[mail/connect] failed:", err);
    return NextResponse.json(
      { error: "Couldn't provision the inbox. Try again." },
      { status: 500 },
    );
  }
}
