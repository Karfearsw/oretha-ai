/* ── Provider-agnostic LLM adapter ──────────────────────────────────
 * Talks to any OpenAI-compatible chat API (OpenAI, Groq, Together,
 * OpenRouter, Meta Model API / Muse, local Ollama/LM Studio, …) or the
 * Anthropic Messages API.
 *
 * Configure via env:
 *   LLM_PROVIDER = openai | anthropic | meta     (default: openai)
 *   LLM_API_KEY  = sk-…                          (required)
 *   LLM_MODEL    = gpt-4o-mini                   (default per provider)
 *   LLM_BASE_URL = https://api.openai.com/v1     (optional override)
 *
 * Meta Model API (Muse Spark): base URL https://api.meta.ai/v1, key from
 * dev.meta.ai (format `LLM|…|…`), model muse-spark-1.3. OpenAI-compatible,
 * but it is a reasoning model that applies `system` content at the
 * `developer` level, rejects `stop`/`logit_bias`, and only supports
 * `tool_choice: "auto"` — we map roles accordingly and never send the
 * unsupported parameters.
 *
 * Tool calling follows the Meta cookbook pattern: define tools as JSON
 * schemas; when the model returns finish_reason="tool_calls", the caller
 * executes each call and appends the assistant message + one `tool`
 * message per tool_call_id, looping until the model answers in text.
 */

import type { ToolSpec } from "@/lib/tools";

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

interface LlmConfig {
  provider: "openai" | "anthropic" | "meta";
  apiKey: string;
  baseUrl: string;
  model: string;
}

function config(): LlmConfig {
  const rawProvider = process.env.LLM_PROVIDER;
  const provider: LlmConfig["provider"] =
    rawProvider === "anthropic" || rawProvider === "meta"
      ? rawProvider
      : "openai";

  const baseUrl = (
    process.env.LLM_BASE_URL ??
    (provider === "anthropic"
      ? "https://api.anthropic.com"
      : provider === "meta"
        ? "https://api.meta.ai/v1"
        : "https://api.openai.com/v1")
  ).replace(/\/+$/, "");

  const model =
    process.env.LLM_MODEL ??
    (provider === "anthropic"
      ? "claude-3-5-haiku-latest"
      : provider === "meta"
        ? "muse-spark-1.3"
        : "gpt-4o-mini");

  return { provider, apiKey: process.env.LLM_API_KEY ?? "", baseUrl, model };
}

export function llmConfigured(): boolean {
  return config().apiKey.trim().length > 0;
}

/** Tool calling is supported on OpenAI-compatible providers (incl. Meta). */
export function toolCallSupported(): boolean {
  return config().provider !== "anthropic";
}

/**
 * Meta Model API (Muse Spark) treats `system` content at the `developer`
 * level — map our system messages to the `developer` role, which is the
 * highest-precedence steering role there.
 */
function mapRolesForMeta(
  messages: LlmMessage[],
): { role: "developer" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: LlmToolCall[] }[] {
  return messages.map((m) => ({
    ...m,
    role: m.role === "system" ? "developer" : m.role,
  }));
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

/**
 * Stream a chat completion, yielding text deltas as they arrive and a
 * final `tool_calls` event if the model wants tools executed. Tool
 * execution itself lives in the caller (see /api/chat) — this adapter
 * only speaks the wire format.
 */
export async function* streamChatWithTools(
  messages: LlmMessage[],
  tools?: ToolSpec[],
): AsyncGenerator<StreamEvent> {
  const { provider, apiKey, baseUrl, model } = config();
  if (!apiKey.trim()) throw new Error("LLM_NOT_CONFIGURED");

  if (provider === "anthropic") {
    // Tool calling not implemented for Anthropic — stream text only.
    const { system, rest } = splitSystem(messages);
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: system || undefined,
        messages: rest,
        stream: true,
      }),
    });
    if (!res.ok)
      throw new Error(`Anthropic ${res.status}: ${await safeErrorText(res)}`);
    for await (const data of parseSse(res)) {
      try {
        const json = JSON.parse(data) as {
          type?: string;
          delta?: { text?: string };
        };
        if (json.type === "content_block_delta" && json.delta?.text)
          yield { type: "text", delta: json.delta.text };
      } catch {
        /* keep-alive or partial frame — skip */
      }
    }
    return;
  }

  // OpenAI-compatible (default; also Meta Model API / Muse Spark)
  const wire = provider === "meta" ? mapRolesForMeta(messages) : messages;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: wire,
      stream: true,
      // tool_choice "auto" is the only supported value — omit and let the
      // model decide (explicit "auto" is also fine, but omitting is safest).
      ...(tools && tools.length > 0 ? { tools } : {}),
    }),
  });
  if (!res.ok)
    throw new Error(`LLM ${res.status}: ${await safeErrorText(res)}`);

  // Accumulate streamed tool-call fragments by index.
  const pending = new Map<number, { id: string; name: string; args: string }>();
  for await (const data of parseSse(res)) {
    try {
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
      /* skip malformed frame */
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

/** Text-only convenience wrapper over streamChatWithTools. */
export async function* streamChat(
  messages: LlmMessage[],
): AsyncGenerator<string> {
  for await (const ev of streamChatWithTools(messages)) {
    if (ev.type === "text") yield ev.delta;
  }
}

/** Single-shot completion (used by the memory summarizer + mail triage). */
export async function chatComplete(
  messages: LlmMessage[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const { provider, apiKey, baseUrl, model } = config();
  if (!apiKey.trim()) throw new Error("LLM_NOT_CONFIGURED");
  const maxTokens = opts?.maxTokens ?? 1024;
  const temperature = opts?.temperature ?? 0.2;

  if (provider === "anthropic") {
    const { system, rest } = splitSystem(messages);
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: system || undefined,
        messages: rest,
      }),
    });
    if (!res.ok)
      throw new Error(`Anthropic ${res.status}: ${await safeErrorText(res)}`);
    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return (json.content ?? [])
      .map((b) => (b.type === "text" ? (b.text ?? "") : ""))
      .join("")
      .trim();
  }

  const wire = provider === "meta" ? mapRolesForMeta(messages) : messages;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: wire,
    }),
  });
  if (!res.ok)
    throw new Error(`LLM ${res.status}: ${await safeErrorText(res)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (json.choices?.[0]?.message?.content ?? "").trim();
}
