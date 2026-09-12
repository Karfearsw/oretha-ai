import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (name) {
    const file = await prisma.agentFile.findUnique({
      where: { userId_name: { userId: session.id, name } },
    });
    if (!file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    return NextResponse.json({ file });
  }

  const files = await prisma.agentFile.findMany({
    where: { userId: session.id },
    orderBy: { name: "asc" },
    select: { name: true, content: true, updatedAt: true },
  });
  return NextResponse.json({ files });
}

export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "");
    const content = String(body.content ?? "");
    if (!name || typeof content !== "string") {
      return NextResponse.json({ error: "Missing file or content." }, { status: 400 });
    }

    const saved = await prisma.agentFile.upsert({
      where: { userId_name: { userId: session.id, name } },
      update: { content },
      create: { userId: session.id, name, content },
    });

    return NextResponse.json({ file: { name: saved.name, updatedAt: saved.updatedAt } });
  } catch (err) {
    console.error("agent file update failed:", err);
    return NextResponse.json({ error: "Couldn't save the file." }, { status: 500 });
  }
}
