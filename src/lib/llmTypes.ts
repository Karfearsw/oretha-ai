/* ── Shared LLM provider-config primitives ────────────────────────────
 * Extracted from llm.ts so per-user (BYOK) config in userLlm.ts and the
 * env-based chain share one source of truth for provider defaults. */

export interface ProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/* ── Known providers: default base URLs + models ───────────────────── */

export const PROVIDER_DEFAULTS: Record<
  string,
  { baseUrl: string; model: string }
> = {
  meta: { baseUrl: "https://api.meta.ai/v1", model: "muse-spark-1.3" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    model: "claude-3-5-haiku-latest",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
  },
  cerebras: { baseUrl: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
  },
  "github-models": {
    baseUrl: "https://models.github.ai/inference",
    model: "openai/gpt-4o",
  },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.3" },
};

export const PROVIDER_NAMES = Object.keys(PROVIDER_DEFAULTS);

/** Build a validated provider config, applying per-provider defaults. */
export function configFor(
  provider: string,
  apiKey: string,
  model?: string | null,
  baseUrl?: string | null,
): ProviderConfig {
  const d = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.openai;
  return {
    provider,
    apiKey: apiKey.trim(),
    baseUrl: (baseUrl || d.baseUrl).replace(/\/+$/, ""),
    model: model || d.model,
  };
}
