/* ── Per-user LLM configuration (bring-your-own-key) ─────────────────
 * Users can store their own provider key in Settings (profile). It's
 * AES-256-GCM-encrypted at rest (same scheme as mailbox keys) and, when
 * present, becomes the PRIMARY provider for everything that user runs:
 * chat, mail triage, memory, workflows. Server env keys act as fallback.
 */

import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/agentmail";
import { configFor, type ProviderConfig } from "@/lib/llmTypes";

export interface UserLlmSettings {
  hasKey: boolean;
  provider: string | null;
  model: string | null;
  baseUrl: string | null; // never returns the key itself
}

/** What the user has stored (no secrets back to the client). */
export async function getUserLlmSettings(
  userId: string,
): Promise<UserLlmSettings> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      llmProvider: true,
      llmApiKeyEnc: true,
      llmModel: true,
      llmBaseUrl: true,
    },
  });
  return {
    hasKey: Boolean(u?.llmApiKeyEnc),
    provider: u?.llmProvider ?? null,
    model: u?.llmModel ?? null,
    baseUrl: u?.llmBaseUrl ?? null,
  };
}

/** Save (or replace) the user's key. Empty/null key clears it. */
export async function setUserLlmKey(
  userId: string,
  opts: {
    apiKey?: string | null;
    provider?: string;
    model?: string | null;
    baseUrl?: string | null;
  },
): Promise<void> {
  const data: Record<string, string | null> = {};
  if (opts.apiKey !== undefined) {
    const key = (opts.apiKey ?? "").trim();
    data.llmApiKeyEnc = key ? JSON.stringify(encryptSecret(key)) : null;
  }
  if (opts.provider !== undefined) data.llmProvider = opts.provider || null;
  if (opts.model !== undefined)
    data.llmModel = (opts.model ?? "").trim() || null;
  if (opts.baseUrl !== undefined)
    data.llmBaseUrl = (opts.baseUrl ?? "").trim() || null;
  if (Object.keys(data).length === 0) return;
  await prisma.user.update({ where: { id: userId }, data });
}

/**
 * The user's decrypted provider config — or null if they haven't stored
 * a usable key. Never logs or returns the key itself.
 */
export async function userProviderConfig(
  userId: string,
): Promise<ProviderConfig | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      llmProvider: true,
      llmApiKeyEnc: true,
      llmModel: true,
      llmBaseUrl: true,
    },
  });
  const box = u?.llmApiKeyEnc;
  if (!box) return null;
  try {
    const parsed = JSON.parse(box) as {
      apiKeyCipher: string;
      iv: string;
      authTag: string;
    };
    const apiKey = decryptSecret(parsed);
    if (!apiKey) return null;
    return configFor(
      u?.llmProvider ?? "openai",
      apiKey,
      u?.llmModel,
      u?.llmBaseUrl,
    );
  } catch {
    return null; // decryption failed (e.g. AUTH_SECRET rotated) — fall back to env
  }
}
