import { NextResponse } from "next/server";
import { sweepDueWorkflows } from "@/lib/scheduler";
import { sweepDueWatches } from "@/lib/watches";
import { recoverStaleTasks } from "@/lib/agentTasks";

/* GET /api/cron/sweep — execute all due workflows.
 * Production: called by the vercel.json cron with `Authorization: Bearer $CRON_SECRET`.
 * Local dev (no CRON_SECRET set): open, since the interval sweeper also runs. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sweepDueWorkflows();
  const watches = await sweepDueWatches();
  const tasks = await recoverStaleTasks();
  return NextResponse.json({ ok: true, ...result, watches, tasks });
}
