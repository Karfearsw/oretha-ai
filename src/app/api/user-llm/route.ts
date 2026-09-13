import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserLlmSettings,
  setUserLlmKey,
} from "@/lib/userLlm";
import { PROVIDER_DEFAULTS } from "@/lib/llmTypes";

/* GET /api/user-llm — the user's BYOK LLM settings (never returns the key). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const settings = await getUserLlmSettings(user.id);
  return NextResponse.json({ settings, providers: Object.keys(PROVIDER_DEFAULTS) });
}

/* PUT /api/user-llm — save/replace/clear the user's own provider key.
 * Body: { apiKey?, provider?, model?, baseUrl? } — empty apiKey clears. */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    apiKey?: string;
    provider?: string;
    model?: string;
    baseUrl?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const provider = (body.provider ?? "openai").trim().toLowerCase();
  if (!(provider in PROVIDER_DEFAULTS))
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });

  if (body.apiKey !== undefined && body.apiKey.trim()) {
    const key = body.apiKey.trim();
    // Keys are short secrets, not essays.
    if (key.length < 8 || key.length > 400)
      return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }

  await setUserLlmKey(user.id, {
    apiKey: body.apiKey,
    provider,
    model: body.model ?? null,
    baseUrl: body.baseUrl ?? null,
  });

  const settings = await getUserLlmSettings(user.id);
  return NextResponse.json({ ok: true, settings });
}
