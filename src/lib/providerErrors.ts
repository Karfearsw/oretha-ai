/* ── Central provider-error mapper (Epic 0 / R0.2) ───────────────────
 * Every error that comes back from a model provider is classified here,
 * once, and turned into one plain-language message for the user. The raw
 * provider body NEVER leaves this module: it is parsed for a code and
 * then dropped. Server logs get provider + status + code only — never
 * the body, never a key.
 */

/** The one human message every provider failure shows (RDP R0.2). */
export const HUMAN_ERROR_MESSAGE =
  "The AI service is temporarily unavailable — your message is saved, try again shortly.";

export type ProviderErrorCode =
  | "billing"
  | "invalid_key"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "provider_error"
  | "not_configured";

/** A provider failure with the raw body stripped out. */
export class ProviderError extends Error {
  provider: string;
  status: number | null;
  code: ProviderErrorCode;

  constructor(
    provider: string,
    status: number | null,
    code: ProviderErrorCode,
    message: string = HUMAN_ERROR_MESSAGE,
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
    this.code = code;
  }
}

/** Pull a machine code out of a provider error body, JSON-safe. */
function codeFromBody(body: string): string {
  if (!body) return "";
  try {
    const json = JSON.parse(body) as {
      error?: { code?: string; message?: string; type?: string };
      code?: string;
    };
    const err = json.error ?? {};
    return String(err.code ?? err.type ?? json.code ?? "").toLowerCase();
  } catch {
    return body.slice(0, 120).toLowerCase();
  }
}

/**
 * Classify a provider HTTP failure. `body` is used for classification
 * only and is never stored on the error.
 */
export function mapProviderError(
  provider: string,
  status: number | null,
  body = "",
): ProviderError {
  const code = codeFromBody(body);
  const bodyLower = body.toLowerCase();

  if (
    status === 402 ||
    code === "billing_not_configured" ||
    code === "billing" ||
    (bodyLower.includes("billing") &&
      (bodyLower.includes("payment") || bodyLower.includes("check your payment")))
  ) {
    return new ProviderError(provider, status, "billing");
  }
  if (
    status === 401 ||
    code === "invalid_api_key" ||
    code === "invalid_key" ||
    code === "authentication_error" ||
    bodyLower.includes("invalid api key") ||
    bodyLower.includes("incorrect api key")
  ) {
    return new ProviderError(provider, status, "invalid_key");
  }
  if (status === 429 || code === "rate_limit_exceeded" || code === "rate_limited") {
    return new ProviderError(provider, status, "rate_limited");
  }
  if (status === 408 || code === "timeout") {
    return new ProviderError(provider, status, "timeout");
  }
  if (status !== null && status >= 500) {
    return new ProviderError(provider, status, "unavailable");
  }
  return new ProviderError(provider, status, "provider_error");
}

/** Normalize any thrown value into a ProviderError. Never embeds raw text. */
export function toProviderError(err: unknown, provider = "provider"): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Error) {
    if (err.message === "LLM_NOT_CONFIGURED")
      return new ProviderError(provider, null, "not_configured");
    if (err.message === "LLM_UNAVAILABLE")
      return new ProviderError(provider, null, "unavailable");
    if (err.name === "AbortError" || err.name === "TimeoutError")
      return new ProviderError(provider, null, "timeout");
  }
  return new ProviderError(provider, null, "unavailable");
}

/** The message a user ever sees for a provider failure. Always the same. */
export function humanMessageFor(_err: unknown): string {
  return HUMAN_ERROR_MESSAGE;
}
