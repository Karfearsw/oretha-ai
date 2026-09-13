/* ── Provider-agnostic LLM adapter ──────────────────────────────────
 * Talks to any OpenAI-compatible chat API (OpenAI, Groq, Together,
 * OpenRouter, local Ollama/LM Studio, …) or Anthropic Messages API.
 *
 * Configure via env:
 *   LLM_PROVIDER = openai | anthropic            (default: openai)
 *   LLM_API_KEY  = sk-…                          (required)
 *   LLM_MODEL    = gpt-4o-mini                   (default per provider)
 *   LLM_BASE_URL = https://api.openai.com/v1     (optional override)
 */

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LlmConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  baseUrl: string;
  model: string;
}

function config(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER === "anthropic"
    ? "anthropic"
    : "openai") as LlmConfig["provider"];

  const baseUrl = (
    process.env.LLM_BASE_URL ??
    (provider === "anthropic"
      ? "https://api.anthropic.com"
      : "https://api.openai.com/v1")
  ).replace(/\/+$/, "");

  const model =
    process.env.LLM_MODEL ??
    (provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini");

  return { provider, apiKey: process.env.LLM_API_KEY ?? "", baseUrl, model };
}

export function llmConfigured(): boolean {
  return config().apiKey.trim().length > 0;
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

/** Stream chat completion deltas as they arrive. */
export async function* streamChat(
  messages: LlmMessage[],
): AsyncGenerator<string> {
  const { provider, apiKey, baseUrl, model } = config();
  if (!apiKey.trim()) throw new Error("LLM_NOT_CONFIGURED");

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
          yield json.delta.text;
      } catch {
        /* keep-alive or partial frame — skip */
      }
    }
    return;
  }

  // OpenAI-compatible (default)
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok)
    throw new Error(`LLM ${res.status}: ${await safeErrorText(res)}`);
  for await (const data of parseSse(res)) {
    try {
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
      };
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      /* skip malformed frame */
    }
  }
}

/** Single-shot completion (used by the memory summarizer). */
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
      messages,
    }),
  });
  if (!res.ok)
    throw new Error(`LLM ${res.status}: ${await safeErrorText(res)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (json.choices?.[0]?.message?.content ?? "").trim();
}
