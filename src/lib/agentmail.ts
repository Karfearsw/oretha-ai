/* ── AgentMail REST client ─────────────────────────────────────────────
 * API: https://api.agentmail.to (Bearer am_… key). Endpoints used:
 *   POST /inboxes                { client_id? }        → inbox resource
 *   GET  /inboxes/:id/messages   ?limit                → { messages: [...] }
 *   POST /inboxes/:id/messages/send                    → send email
 * Create passes an idempotent client_id so retries can't duplicate inboxes.
 * The user's API key is stored AES-256-GCM-encrypted at rest.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createHash, randomUUID } from "node:crypto";

const API = (
  process.env.AGENTMAIL_BASE_URL ?? "https://api.agentmail.to"
).replace(/\/+$/, "");
const KEY_CACHE = new Map<string, string>();

/* ── key encryption (AES-256-GCM, key derived from AUTH_SECRET) ─────── */

function masterKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "oretha-dev-secret";
  return createHash("sha256").update(`oretha-mailbox:${secret}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    apiKeyCipher: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(box: {
  apiKeyCipher: string;
  iv: string;
  authTag: string;
}): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(box.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(box.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(box.apiKeyCipher, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/* ── authenticated fetch (short-lived per-process key cache) ────────── */

async function amFetch(
  path: string,
  apiKey: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AgentMail ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/* ── public API ─────────────────────────────────────────────────────── */

export function amValidateKey(apiKey: string): boolean {
  return /^am_[A-Za-z0-9_-]{10,}$/.test(apiKey.trim());
}

/** Smoke-test a key before storing it. */
export async function amVerifyKey(apiKey: string): Promise<boolean> {
  try {
    await amFetch("/inboxes?limit=1", apiKey);
    return true;
  } catch {
    return false;
  }
}

/** Create the agent's own inbox. client_id makes retries idempotent. */
export async function amCreateInbox(
  apiKey: string,
  opts: { username?: string; displayName?: string; clientId: string },
): Promise<{ inboxId: string; address: string; displayName: string | null }> {
  const json = (await amFetch("/inboxes", apiKey, {
    method: "POST",
    body: JSON.stringify({
      client_id: opts.clientId,
      ...(opts.username ? { username: opts.username } : {}),
      ...(opts.displayName ? { display_name: opts.displayName } : {}),
    }),
  })) as {
    inbox_id?: string;
    inboxId?: string;
    id?: string;
    username?: string;
    domain?: string;
    display_name?: string | null;
  };

  const inboxId = json.inbox_id ?? json.inboxId ?? json.id ?? "";
  if (!inboxId) throw new Error("AgentMail inbox creation returned no id");
  const address =
    json.domain && json.username ? `${json.username}@${json.domain}` : inboxId;
  return { inboxId, address, displayName: json.display_name ?? null };
}

export interface AmMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: Date;
}

/** List recent inbound messages for an inbox. */
export async function amListMessages(
  apiKey: string,
  inboxId: string,
  limit = 25,
): Promise<AmMessage[]> {
  const json = (await amFetch(
    `/inboxes/${encodeURIComponent(inboxId)}/messages?limit=${limit}`,
    apiKey,
  )) as {
    messages?: {
      id?: string;
      message_id?: string;
      from?: string;
      sender?: string;
      subject?: string;
      text?: string;
      extracted_text?: string;
      created_at?: string;
    }[];
  };

  return (json.messages ?? []).map((m) => ({
    id: String(m.id ?? m.message_id ?? randomUUID()),
    from: String(m.from ?? m.sender ?? "unknown"),
    subject: String(m.subject ?? "(no subject)"),
    preview: String(m.extracted_text ?? m.text ?? "").slice(0, 160),
    receivedAt: m.created_at ? new Date(m.created_at) : new Date(),
  }));
}

/** Send an email from the agent's inbox. */
export async function amSend(
  apiKey: string,
  inboxId: string,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  await amFetch(`/inboxes/${encodeURIComponent(inboxId)}/messages/send`, apiKey, {
    method: "POST",
    body: JSON.stringify({ to, subject, text }),
  });
}
