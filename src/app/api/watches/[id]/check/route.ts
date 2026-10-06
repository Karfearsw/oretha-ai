import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { checkWatch } from "@/lib/watches";

type Ctx = { params: Promise<{ id: string }> };

/* POST /api/watches/:id/check — check the watch right now (Run now). */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const watch = await prisma.watch.findFirst({ where: { id, userId: user.id } });
  if (!watch) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await checkWatch(user.id, watch);
  const refreshed = await prisma.watch.findUnique({ where: { id } });
  return NextResponse.json({
    result,
    watch: refreshed
      ? {
          id: refreshed.id,
          lastStatus: refreshed.lastStatus,
          lastError: refreshed.lastError,
          lastCheckAt: refreshed.lastCheckAt,
          failCount: refreshed.failCount,
        }
      : null,
  });
}
