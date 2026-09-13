import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { generateAgentFiles, AGENT_FILE_NAMES } from "@/lib/agentFiles";
import type { SetupPayload } from "@/components/setup/types";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SetupPayload;

    const payload: SetupPayload = {
      agentName: (body.agentName || "Oretha").trim().slice(0, 40),
      agentEmoji: (body.agentEmoji || "").trim().slice(0, 8),
      voice: body.voice ?? "balanced",
      censorship: body.censorship ?? "open",
      empowerment: body.empowerment ?? true,
      responseLength: body.responseLength ?? "balanced",
      timezone: body.timezone ? String(body.timezone).slice(0, 64) : null,
      userFirstName: (body.userFirstName || session.name.split(" ")[0] || "friend").trim().slice(0, 60),
      userWork: body.userWork ? String(body.userWork).trim().slice(0, 200) : null,
      userInterests: Array.isArray(body.userInterests)
        ? body.userInterests.slice(0, 12).map((i) => String(i).trim().slice(0, 40)).filter(Boolean)
        : [],
      // The mailbox key never enters agent files — it's consumed by /api/mail/connect.
      mailboxApiKey: null,
    };

    const files = generateAgentFiles(payload);

    const [, user] = await prisma.$transaction([
      prisma.agentFile.deleteMany({ where: { userId: session.id } }),
      prisma.user.update({
        where: { id: session.id },
        data: {
          setupCompleted: true,
          agentName: payload.agentName,
          agentEmoji: payload.agentEmoji,
          voice: payload.voice,
          censorship: payload.censorship,
          empowerment: payload.empowerment,
          responseLength: payload.responseLength,
          timezone: payload.timezone,
          agentFiles: {
            create: AGENT_FILE_NAMES.map((name) => ({
              name,
              content: files[name],
            })),
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, user: { id: user.id } });
  } catch (err) {
    console.error("setup failed:", err);
    return NextResponse.json(
      { error: "Setup couldn't be saved. Try again." },
      { status: 500 },
    );
  }
}
