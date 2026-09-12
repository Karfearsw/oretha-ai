import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | boolean> = {};

    if (typeof body.censorship === "string" && ["open", "guarded", "strict"].includes(body.censorship)) {
      data.censorship = body.censorship;
    }
    if (typeof body.empowerment === "boolean") {
      data.empowerment = body.empowerment;
    }
    if (typeof body.responseLength === "string" && ["concise", "balanced", "detailed"].includes(body.responseLength)) {
      data.responseLength = body.responseLength;
    }
    if (typeof body.agentName === "string" && body.agentName.trim()) {
      data.agentName = body.agentName.trim().slice(0, 40);
    }
    if (typeof body.agentEmoji === "string") {
      data.agentEmoji = body.agentEmoji.trim().slice(0, 8);
    }
    if (typeof body.tagline === "string") {
      data.tagline = body.tagline.trim().slice(0, 120) || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: user.id });
  } catch (err) {
    console.error("settings update failed:", err);
    return NextResponse.json({ error: "Couldn't save settings." }, { status: 500 });
  }
}
