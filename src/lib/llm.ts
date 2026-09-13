/* ── Provider-agnostic LLM adapter with failover ─────────────────────
 * Primary provider comes from LLM_* env vars; additional providers come
 * from LLM_FALLBACKS and are tried in order whenever a provider fails
 * BEFORE the first streamed token (rate limit, outage, bad key, timeout).
 * Once tokens are flowing we never switch mid-stream.
 *
 * Configure via env:
 *   LLM_PROVIDER = meta | openai | anthropic | groq | openrouter | …
 *   LLM_API_KEY  = provider key                     (required)
 *   LLM_MODEL    = model id                         (default per provider)
 *   LLM_BASE_URL = optional override                (default per provider)
 *   LLM_FALLBACKS = "groq::gsk_…::llama-3.3-70b-versatile;openrouter::sk-or-…::meta-llama/llama-3.3-70b-instruct:free"
 *       spec format:  provider::apiKey[::model][::baseUrl]  — entries split by ";"
 *
 * Meta Model API (Muse Spark): api.meta.ai/v1, key `LLM|…|…`, model
 * muse-spark-1.3. OpenAI-compatible but a reasoning model: `system`
 * content is applied at the `developer` level; `stop`/`logit_bias` are
 * rejected; only `tool_choice: "auto"` is supported.
 */

import type { ToolSpec } from "@/lib/tools";
import {
  configFor,
  type ProviderConfig,
} from "@/lib/llmTypes";
import { userProviderConfig } from "@/lib/userLlm";

export type { ProviderConfig } from "@/lib/llmTypes";
export { PROVIDER_DEFAULTS, PROVIDER_NAMES } from "@/lib/llmTypes";

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: LlmToolCall[];
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_calls"; calls: LlmToolCall[] };

/* ── Known providers: default base URLs + models (in llmTypes.ts) ──── */

/** Primary provider config from the classic LLM_* env vars. */
function primaryConfig(): ProviderConfig {
  return configFor(
    process.env.LLM_PROVIDER ?? "openai",
    process.env.LLM_API_KEY ?? "",
    process.env.LLM_MODEL,
    process.env.LLM_BASE_URL,
  );
}

/** Parse LLM_FALLBACKS: "provider::key[::model][::url];…" */
function fallbackConfigs(): ProviderConfig[] {
  const raw = (process.env.LLM_FALLBACKS ?? "").trim();
  if (!raw) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((spec) => {
      const [provider, apiKey, model, baseUrl] = spec.split("::");
      return configFor(provider, apiKey ?? "", model, baseUrl);
    })
    .filter((c) => c.apiKey.length > 0);
}

/** The full failover chain: user key first, then env primary, then env fallbacks. */
function chain(): ProviderConfig[] {
  return [primaryConfig(), ...fallbackConfigs()].filter((c) => c.apiKey);
}

/** Env-only chain (no user key) — for status reporting. */
function envChain(): ProviderConfig[] {
  return chain();
}

/**
 * Chain for a specific user: their own stored key (BYOK) becomes the
 * primary; env keys follow as fallback. Falls back cleanly when the
 * user has no key.
 */
async function chainForUser(userId?: string | null): Promise<ProviderConfig[]> {
  const env = envChain();
  if (!userId) return env;
  const userCfg = await userProviderConfig(userId).catch(() => null);
  if (!userCfg) return env;
  return [userCfg, ...env];
}

export function llmConfigured(): boolean {
  return chain().length > 0;
}

export interface LlmChainInfo {
  configured: boolean;
  primary: { provider: string; model: string } | null;
  fallbacks: { provider: string; model: string }[];
}

/** Chain summary for /api/llm-status and diagnostics. */
export function llmChainInfo(): LlmChainInfo {
  const c = chain();
  return {
    configured: c.length > 0,
    primary: c[0]
      ? { provider: c[0].provider, model: c[0].model }
      : null,
    fallbacks: c.slice(1).map((x) => ({ provider: x.provider, model: x.model })),
  };
}

/** Tool calling is supported on OpenAI-compatible providers (incl. Meta). */
export function toolCallSupported(): boolean {
  return chain()[0]?.provider !== "anthropic";
}

/** Wire shape sent to OpenAI-compatible endpoints — Meta uses `developer`. */
type WireMessage = {
  role: "developer" | "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: LlmToolCall[];
};

/**
 * Meta Model API (Muse Spark) treats `system` content at the `developer`
 * level — map our system messages to the `developer` role, which is the
 * highest-precedence steering role there.
 */
function mapRolesForMeta(messages: LlmMessage[]): WireMessage[] {
  return messages.map((m) =>
    m.role === "system" ? { ...m, role: "developer" as const } : m,
  );
}

/** Split system messages out — Anthropic takes `system` as a top-level field. */
function splitSystem(messages: LlmMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n---\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  return { system, rest };
}

async function safeErrorText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "(no body)";
  }
}

/** Fetch that aborts if response headers don't arrive within `ms`. */
async function fetchWithHeaderTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const CONNECT_TIMEOUT_MS = 15_000;

/* ── Wire-format request builders (per provider family) ────────────── */

interface PreparedRequest {
  url: string;
  init: RequestInit;
  family: "openai" | "anthropic";
}

function prepareStream(
  cfg: ProviderConfig,
  messages: LlmMessage[],
  tools?: ToolSpec[],
): PreparedRequest {
  if (cfg.provider === "anthropic") {
    const { system, rest } = splitSystem(messages);
    return {
      family: "anthropic",
      url: `${cfg.baseUrl}/v1/messages`,
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 2048,
          system: system || undefined,
          messages: rest,
          stream: true,
        }),
      },
    };
  }

  const wire = cfg.provider === "meta" ? mapRolesForMeta(messages) : messages;
  return {
    family: "openai",
    url: `${cfg.baseUrl}/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: wire,
        stream: true,
        // tool_choice "auto" is the only supported value on Meta — omit
        // entirely and let the model decide.
        ...(tools && tools.length > 0 ? { tools } : {}),
      }),
    },
  };
}

function prepareComplete(
  cfg: ProviderConfig,
  messages: LlmMessage[],
  maxTokens: number,
  temperature: number,
): PreparedRequest {
  if (cfg.provider === "anthropic") {
    const { system, rest } = splitSystem(messages);
    return {
      family: "anthropic",
      url: `${cfg.baseUrl}/v1/messages`,
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: maxTokens,
          temperature,
          system: system || undefined,
          messages: rest,
        }),
      },
    };
  }

  const wire = cfg.provider === "meta" ? mapRolesForMeta(messages) : messages;
  return {
    family: "openai",
    url: `${cfg.baseUrl}/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        temperature,
        messages: wire,
      }),
    },
  };
}

/* ── SSE parsing ───────────────────────────────────────────────────── */

/** Yield raw `data:` payloads from an SSE response body. */
async function* parseSse(res: Response): AsyncGenerator<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("LLM provider returned no response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\n\n/);
    buffer = events.pop() ?? "";
    for (const evt of events) {
      for (const line of evt.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        yield data;
      }
    }
  }
}

async function* consumeSseEvents(
  res: Response,
  family: "openai" | "anthropic",
): AsyncGenerator<StreamEvent> {
  // Accumulate streamed tool-call fragments by index (OpenAI family).
  const pending = new Map<number, { id: string; name: string; args: string }>();

  for await (const data of parseSse(res)) {
    try {
      if (family === "anthropic") {
        const json = JSON.parse(data) as {
          type?: string;
          delta?: { text?: string };
        };
        if (json.type === "content_block_delta" && json.delta?.text)
          yield { type: "text", delta: json.delta.text };
        continue;
      }

      const json = JSON.parse(data) as {
        choices?: {
          delta?: {
            content?: string;
            tool_calls?: {
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }[];
          };
        }[];
      };
      const choice = json.choices?.[0];
      if (!choice) continue;
      if (choice.delta?.content)
        yield { type: "text", delta: choice.delta.content };
      for (const tc of choice.delta?.tool_calls ?? []) {
        const cur = pending.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name += tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        pending.set(tc.index, cur);
      }
    } catch {
      /* keep-alive or malformed frame — skip */
    }
  }

  if (pending.size > 0) {
    const calls: LlmToolCall[] = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, c]) => ({
        id: c.id || `call_${c.name}`,
        name: c.name,
        arguments: c.args || "{}",
      }));
    yield { type: "tool_calls", calls };
  }
}

/* ── Public streaming API with failover ────────────────────────────── */

/**
 * Stream a chat completion, yielding text deltas as they arrive and a
 * final `tool_calls` event if the model wants tools executed. Tries the
 * provider chain in order; failover happens only before the first token.
 * Tool execution itself lives in the caller (see /api/chat).
 */
export async function* streamChatWithTools(
  messages: LlmMessage[],
  tools?: ToolSpec[],
  opts?: { userId?: string | null },
): AsyncGenerator<StreamEvent> {
  const providers = await chainForUser(opts?.userId);
  if (providers.length === 0) throw new Error("LLM_NOT_CONFIGURED");

  let lastError: unknown = null;

  for (let i = 0; i < providers.length; i++) {
    const cfg = providers[i];
    let res: Response;
    let prep: PreparedRequest;
    try {
      prep = prepareStream(cfg, messages, tools);
      res = await fetchWithHeaderTimeout(
        prep.url,
        prep.init,
        CONNECT_TIMEOUT_MS,
      );
    } catch (err) {
      lastError = err;
      console.error(
        `[llm] provider ${i} (${cfg.provider}/${cfg.model}) unreachable:`,
        err instanceof Error ? err.message : err,
      );
      continue; // failover
    }

    if (!res.ok) {
      lastError = new Error(
        `${cfg.provider} ${res.status}: ${await safeErrorText(res)}`,
      );
      console.error(
        `[llm] provider ${i} (${cfg.provider}/${cfg.model}) failed → trying next` +
          (i < providers.length - 1 ? "" : " (none left)"),
      );
      continue; // failover
    }

    // Headers OK — this provider owns the stream now. Any failure after
    // the first token is surfaced, never retried on another provider.
    for await (const ev of consumeSseEvents(res, prep.family)) yield ev;
    return;
  }

  throw lastError ?? new Error("LLM_UNAVAILABLE");
}

/** Text-only convenience wrapper over streamChatWithTools. */
export async function* streamChat(
  messages: LlmMessage[],
): AsyncGenerator<string> {
  for await (const ev of streamChatWithTools(messages)) {
    if (ev.type === "text") yield ev.delta;
  }
}

/** Single-shot completion (memory summarizer, mail triage) with failover. */
export async function chatComplete(
  messages: LlmMessage[],
  opts?: {
    maxTokens?: number;
    temperature?: number;
    userId?: string | null;
  },
): Promise<string> {
  const providers = await chainForUser(opts?.userId);
  if (providers.length === 0) throw new Error("LLM_NOT_CONFIGURED");
  const maxTokens = opts?.maxTokens ?? 1024;
  const temperature = opts?.temperature ?? 0.2;

  let lastError: unknown = null;
  for (const cfg of providers) {
    try {
      const prep = prepareComplete(cfg, messages, maxTokens, temperature);
      const res = await fetchWithHeaderTimeout(
        prep.url,
        prep.init,
        CONNECT_TIMEOUT_MS,
      );
      if (!res.ok) {
        lastError = new Error(
          `${cfg.provider} ${res.status}: ${await safeErrorText(res)}`,
        );
        continue;
      }

      if (prep.family === "anthropic") {
        const json = (await res.json()) as {
          content?: { type: string; text?: string }[];
        };
        return (json.content ?? [])
          .map((b) => (b.type === "text" ? (b.text ?? "") : ""))
          .join("")
          .trim();
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return (json.choices?.[0]?.message?.content ?? "").trim();
    } catch (err) {
      lastError = err;
      console.error(
        `[llm] background call via ${cfg.provider}/${cfg.model} failed → trying next`,
      );
    }
  }
  throw lastError ?? new Error("LLM_UNAVAILABLE");
}
