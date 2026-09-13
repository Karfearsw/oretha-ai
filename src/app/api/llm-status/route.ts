import { NextResponse } from "next/server";
import { llmChainInfo } from "@/lib/llm";
import { getSessionUser } from "@/lib/auth";
import { getUserLlmSettings } from "@/lib/userLlm";

/* GET /api/llm-status — lets the UI adapt when no provider key is set.
 * Reports the active chain for the signed-in user: their own BYOK key
 * (if stored) is primary; server env keys follow as fallback. */
export async function GET() {
  const session = await getSessionUser();
  const info = llmChainInfo();
  const userSettings = session
    ? await getUserLlmSettings(session.id)
    : null;

  const usingUserKey = Boolean(userSettings?.hasKey);

  return NextResponse.json({
    configured: info.configured || usingUserKey,
    // When the user rides their own key, report their provider/model.
    provider: usingUserKey
      ? (userSettings?.provider ?? "openai")
      : (info.primary?.provider ?? process.env.LLM_PROVIDER ?? "openai"),
    model: usingUserKey
      ? (userSettings?.model ?? null)
      : (info.primary?.model ?? process.env.LLM_MODEL ?? null),
    fallbacks: info.fallbacks,
    source: usingUserKey ? "user" : info.configured ? "server" : "none",
  });
}
