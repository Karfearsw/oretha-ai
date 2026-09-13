import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/* GET /api/plan — current plan. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { plan: true },
  });
  return NextResponse.json({ plan: user?.plan ?? "free" });
}

/* PUT /api/plan — switch plans.
 * Today this is a self-serve activation (no payment processor wired yet):
 * "pro" unlocks the higher limits immediately. When billing goes live,
 * this endpoint becomes the webhook-driven state change only. */
export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const plan = body?.plan?.trim().toLowerCase();
  if (!plan || !["free", "pro"].includes(plan))
    return NextResponse.json({ error: "bad_plan" }, { status: 400 });

  await prisma.user.update({ where: { id: session.id }, data: { plan } });
  return NextResponse.json({ ok: true, plan });
}
