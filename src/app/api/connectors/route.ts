import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  CONNECTOR_CATALOG,
  validateConnector,
  saveConnectorToken,
  deleteConnector,
  type ConnectorKind,
} from "@/lib/connectors";

/* GET /api/connectors — catalog with the user's real connection state. */
export async function GET() {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [rows, mailbox] = await Promise.all([
    prisma.connector.findMany({ where: { userId: session.id } }),
    prisma.mailbox.findFirst({ where: { userId: session.id } }),
  ]);

  const byKind = new Map(rows.map((r) => [r.kind, r]));

  const connectors = CONNECTOR_CATALOG.map((c) => {
    if (c.id === "email") {
      return {
        ...c,
        connected: Boolean(mailbox),
        meta: mailbox ? { address: mailbox.address } : null,
        lastSyncAt: mailbox?.lastSyncAt?.toISOString() ?? null,
        lastSyncInfo: mailbox ? "mailroom" : null,
        helpHref: mailbox ? "/office/inbox" : "/office/inbox",
      };
    }
    const row = byKind.get(c.id);
    return {
      ...c,
      connected: Boolean(row),
      meta: row ? (JSON.parse(row.meta || "{}") as Record<string, unknown>) : null,
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncInfo: row?.lastSyncInfo ?? null,
    };
  });

  return NextResponse.json({ connectors });
}

/* PUT /api/connectors — validate a pasted key live, then store encrypted.
 * Body: { kind, apiKey } */
export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    kind?: string;
    apiKey?: string;
  } | null;
  const kind = body?.kind as ConnectorKind;
  const apiKey = body?.apiKey?.trim();

  if (!kind || !apiKey || apiKey.length < 8 || apiKey.length > 400)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const entry = CONNECTOR_CATALOG.find((c) => c.id === kind);
  if (!entry?.keyConnectable)
    return NextResponse.json({ error: "not_key_connectable" }, { status: 400 });

  const verdict = await validateConnector(kind, apiKey);
  if (!verdict.ok)
    return NextResponse.json({ ok: false, error: verdict.error }, { status: 400 });

  await saveConnectorToken(session.id, kind, apiKey, verdict.meta);
  return NextResponse.json({ ok: true, meta: verdict.meta });
}

/* DELETE /api/connectors — disconnect.
 * DELETE /api/connectors?kind=github */
export async function DELETE(req: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = new URL(req.url).searchParams.get("kind") as ConnectorKind | null;
  if (!kind || kind === "email")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await deleteConnector(session.id, kind);
  return NextResponse.json({ ok: true });
}
