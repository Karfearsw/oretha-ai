/* ── Provider billing health probe (Epic 0 / R0.4) ────────────────────
 * Cheap, read-only check that the server-side provider keys can still
 * bill. OpenAI-compatible providers answer GET {baseUrl}/models with
 * no completion cost. Anthropic has no list endpoint, so it reports
 * probe: "unsupported" instead of spending a completion on a probe.
 *
 * A probe that finds billing trouble pages the operator (same path as
 * a real-traffic 402). Probing is explicit: the caller asks for it.
 */

import { envProviderConfigs } from "@/lib/llm";
import { mapProviderError } from "@/lib/providerErrors";
import { notifyOperator } from "@/lib/operatorAlert";

export type ProbeStatus =
  | "ok"
  | "billing"
  | "invalid_key"
  | "unavailable"
  | "unknown"
  | "unsupported";

export interface ProviderProbe {
  provider: string;
  model: string;
  status: ProbeStatus;
  code: string | null;
  checkedAt: string;
}

/** Probe every server-side (env) provider key. User BYOK keys are not probed. */
export async function probeProviderBilling(): Promise<ProviderProbe[]> {
  const results: ProviderProbe[] = [];

  for (const cfg of envProviderConfigs()) {
    const checkedAt = new Date().toISOString();
    if (cfg.provider === "anthropic") {
      results.push({
        provider: cfg.provider,
        model: cfg.model,
        status: "unsupported",
        code: null,
        checkedAt,
      });
      continue;
    }

    try {
      const res = await fetch(`${cfg.baseUrl}/models`, {
        headers: { authorization: `Bearer ${cfg.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        results.push({ provider: cfg.provider, model: cfg.model, status: "ok", code: null, checkedAt });
        continue;
      }
      const body = await res.text().catch(() => "");
      const pe = mapProviderError(cfg.provider, res.status, body);
      const status: ProbeStatus =
        pe.code === "billing"
          ? "billing"
          : pe.code === "invalid_key"
            ? "invalid_key"
            : pe.code === "rate_limited"
              ? "unavailable"
              : pe.code === "timeout"
                ? "unavailable"
                : "unknown";
      results.push({ provider: cfg.provider, model: cfg.model, status, code: pe.code, checkedAt });

      if (status === "billing") {
        await notifyOperator({
          code: "billing",
          title: "Provider billing check failed (402)",
          detail:
            `Health probe: ${cfg.provider} (${cfg.model}) returned HTTP ${res.status} (billing). ` +
            "Chat and workflow runs will fail until billing is fixed — see RDP Epic 0.",
        });
      }
    } catch {
      results.push({
        provider: cfg.provider,
        model: cfg.model,
        status: "unavailable",
        code: "timeout",
        checkedAt,
      });
    }
  }

  return results;
}
