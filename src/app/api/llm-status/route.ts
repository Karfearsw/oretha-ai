import { NextResponse } from "next/server";
import { llmConfigured } from "@/lib/llm";

/* GET /api/llm-status — lets the UI adapt when no provider key is set. */
export async function GET() {
  return NextResponse.json({
    configured: llmConfigured(),
    provider: process.env.LLM_PROVIDER ?? "openai",
    model: process.env.LLM_MODEL ?? null,
  });
}
