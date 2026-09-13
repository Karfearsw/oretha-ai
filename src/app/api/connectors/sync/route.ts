import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { syncAllConnectors } from "@/lib/connectors";

/* POST /api/connectors/sync — pull assigned work from every connected
 * service onto the task board. */
export async function POST() {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const results = await syncAllConnectors(session.id);
  const created = results.reduce((n, r) => n + r.created, 0);
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok: failed.length === 0 || created > 0,
    created,
    results,
  });
}
