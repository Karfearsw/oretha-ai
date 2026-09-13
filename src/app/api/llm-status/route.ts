import { NextResponse } from "next/server";
import { llmChainInfo } from "@/lib/llm";

/* GET /api/llm-status — lets the UI adapt when no provider key is set,
 * and shows the active provider chain (primary + fallbacks). */
export async function GET() {
  const info = llmChainInfo();
  return NextResponse.json({
    configured: info.configured,
    provider: info.primary?.provider ?? process.env.LLM_PROVIDER ?? "openai",
    model: info.primary?.model ?? process.env.LLM_MODEL ?? null,
    fallbacks: info.fallbacks,
  });
}
