import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createWatch, nextDueAt } from "@/lib/watches";

const KINDS = ["change", "text", "price"] as const;
const SCHEDULES = ["hourly", "daily"] as const;

/* GET /api/watches — the user's page watches. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const watches = await prisma.watch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    watches: watches.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      kind: w.kind,
      needle: w.needle,
      threshold: w.threshold,
      schedule: w.schedule,
      enabled: w.enabled,
      lastCheckAt: w.lastCheckAt,
      lastStatus: w.lastStatus,
      lastError: w.lastError,
      lastValue: w.lastValue,
      failCount: w.failCount,
      nextDueAt: nextDueAt(w),
    })),
  });
}

/* POST /api/watches — create a watch. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    url?: string;
    kind?: string;
    needle?: string;
    threshold?: number;
    schedule?: string;
  } | null;

  if (!body?.name || !body?.url)
    return NextResponse.json({ error: "Name and URL are required." }, { status: 400 });
  if (body.kind && !KINDS.includes(body.kind as (typeof KINDS)[number]))
    return NextResponse.json({ error: "Unknown watch kind." }, { status: 400 });
  if (body.schedule && !SCHEDULES.includes(body.schedule as (typeof SCHEDULES)[number]))
    return NextResponse.json({ error: "Unknown schedule." }, { status: 400 });

  const outcome = await createWatch(user.id, {
    name: body.name,
    url: body.url,
    kind: (body.kind as (typeof KINDS)[number]) ?? "change",
    needle: body.needle ?? null,
    threshold: typeof body.threshold === "number" ? body.threshold : null,
    schedule: body.schedule ?? "daily",
  });

  if ("error" in outcome)
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  return NextResponse.json({ watch: outcome });
}
