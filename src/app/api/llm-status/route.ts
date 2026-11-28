import { NextResponse } from "next/server";
import { llmChainInfo } from "@/lib/llm";
import { getSessionUser } from "@/lib/auth";
import { getUserLlmSettings } from "@/lib/userLlm";
import { probeProviderBilling } from "@/lib/providerHealth";
import { notifyOperator } from "@/lib/operatorAlert";

/* GET /api/llm-status — lets the UI adapt when no provider key is set.
 * Reports the active chain for the signed-in user: their own BYOK key
 * (if stored) is primary; server env keys follow as fallback.
 *
 * Epic 0 (R0.4): `?probe=1` also runs a read-only billing probe over
 * the server-side provider keys (GET {baseUrl}/models, no completion
 * cost) and reports alerting state. A probe that finds billing trouble
 * pages the operator. Anthropic has no list endpoint, so it reports
 * probe: "unsupported" instead of spending a completion. */
export async function GET(req: Request) {
  const session = await getSessionUser();
  const info = llmChainInfo();
  const userSettings = session
    ? await getUserLlmSettings(session.id)
    : null;

  const usingUserKey = Boolean(userSettings?.hasKey);
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const billing = probe ? await probeProviderBilling() : null;

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
    // Epic 0: billing health + operator alerting state.
    billing,
    alerting: {
      channel: process.env.DISCORD_ALERT_WEBHOOK_URL ? "discord" : "none",
      configured: Boolean(process.env.DISCORD_ALERT_WEBHOOK_URL),
    },
  });
}

/* POST /api/llm-status { testAlert: true } — fire a test operator alert.
 * Signed-in users only; cooldown-guarded in notifyOperator. Lets QA
 * prove the S0.4 alert path end to end once the webhook is configured. */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    testAlert?: boolean;
  } | null;
  if (!body?.testAlert) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await notifyOperator({
    code: "test",
    title: "Test alert from Oretha",
    detail:
      "Operator alert path check requested from /api/llm-status. If you are reading this, billing alerts reach the operator channel.",
  });
  return NextResponse.json({ alert: result });
}
