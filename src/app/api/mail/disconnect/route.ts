import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/* POST /api/mail/disconnect — remove the inbox connection (cascades emails). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.mailbox.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
