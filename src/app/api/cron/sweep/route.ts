import { NextResponse } from "next/server";
import { sweepDueWorkflows } from "@/lib/scheduler";

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
  return NextResponse.json({ ok: true, ...result });
}
