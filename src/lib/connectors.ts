/* ── Connectors: secure, account-level integrations ───────────────────
 * Keys are validated live where feasible, then AES-256-GCM-encrypted at
 * rest. Only a safe metadata subset comes back to the UI.
 *
 * Sync support is narrower than connect support: today GitHub + Linear
 * create task-board rows; the rest are verified/account-linked only.
 */

import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/agentmail";

const GITHUB_API = (
  process.env.GITHUB_API_BASE ?? "https://api.github.com"
).replace(/\/+$/, "");
const LINEAR_API = (
  process.env.LINEAR_API_BASE ?? "https://api.linear.app/graphql"
).replace(/\/+$/, "");
const VERCEL_API = (
  process.env.VERCEL_API_BASE ?? "https://api.vercel.com"
).replace(/\/+$/, "");
const NEON_API = (
  process.env.NEON_API_BASE ?? "https://console.neon.tech/api/v2"
).replace(/\/+$/, "");
const TELNYX_API = (
  process.env.TELNYX_API_BASE ?? "https://api.telnyx.com/v2"
).replace(/\/+$/, "");
const STRIPE_API = (
  process.env.STRIPE_API_BASE ?? "https://api.stripe.com/v1"
).replace(/\/+$/, "");
const OPENAI_API = (
  process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1"
).replace(/\/+$/, "");
const GROQ_API = (
  process.env.GROQ_API_BASE ?? "https://api.groq.com/openai/v1"
).replace(/\/+$/, "");
const ANTHROPIC_API = (
  process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com/v1"
).replace(/\/+$/, "");
const DISCORD_API = (
  process.env.DISCORD_API_BASE ?? "https://discord.com/api/v10"
).replace(/\/+$/, "");

export type ConnectorKind =
  | "github"
  | "linear"
  | "email"
  | "vercel"
  | "neon"
  | "telnyx"
  | "gmail"
  | "google_calendar"
  | "stripe"
  | "groq"
  | "openai"
  | "anthropic"
  | "discord"
  | "drive"
  | "tiktok"
  | "youtube"
  | "instagram";

export interface ConnectorCatalogEntry {
  id: ConnectorKind;
  name: string;
  desc: string;
  /** Can be connected with a user-pasted key today. */
  keyConnectable: boolean;
  /** Requires an Oretha OAuth app (not available yet). */
  oauthOnly: boolean;
  /** Can create task-board rows. */
  syncSupported: boolean;
  /** External provider page for setup/manage. */
  manageUrl?: string;
  keyHint?: string;
  keyUrl?: string;
}

export const CONNECTOR_CATALOG: ConnectorCatalogEntry[] = [
  {
    id: "github",
    name: "GitHub",
    desc: "Assigned issues + PRs awaiting your review → task board",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: true,
    manageUrl: "https://github.com/settings/apps",
    keyHint: "ghp_… token with repo + reads",
    keyUrl: "https://github.com/settings/tokens/new?scopes=repo,read:user",
  },
  {
    id: "linear",
    name: "Linear",
    desc: "Assigned issues → task board",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: true,
    manageUrl: "https://linear.app/settings/api",
    keyHint: "lin_api_… key",
    keyUrl: "https://linear.app/settings/api",
  },
  {
    id: "email",
    name: "Email",
    desc: "Inbox triage + task intake (agent mailroom)",
    keyConnectable: false,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "/office/inbox",
  },
  {
    id: "vercel",
    name: "Vercel",
    desc: "Projects, deployments, and preview ownership",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://vercel.com/account/tokens",
    keyHint: "vercel token",
    keyUrl: "https://vercel.com/account/tokens",
  },
  {
    id: "neon",
    name: "Neon",
    desc: "Serverless Postgres projects and branch environments",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://console.neon.tech/app/settings/api-keys",
    keyHint: "Neon API key",
    keyUrl: "https://console.neon.tech/app/settings/api-keys",
  },
  {
    id: "telnyx",
    name: "Telnyx",
    desc: "Phone, messaging, and voice operations",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://portal.telnyx.com/#/app/api-keys",
    keyHint: "KEY... Telnyx API key",
    keyUrl: "https://portal.telnyx.com/#/app/api-keys",
  },
  {
    id: "gmail",
    name: "Gmail",
    desc: "Customer inbox and sender workflows",
    keyConnectable: false,
    oauthOnly: true,
    syncSupported: false,
    manageUrl: "https://myaccount.google.com/permissions",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    desc: "Calendar sync, scheduling, and meeting context",
    keyConnectable: false,
    oauthOnly: true,
    syncSupported: false,
    manageUrl: "https://myaccount.google.com/permissions",
  },
  {
    id: "stripe",
    name: "Stripe",
    desc: "Payments, subscriptions, and revenue visibility",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://dashboard.stripe.com/apikeys",
    keyHint: "sk_... secret key",
    keyUrl: "https://dashboard.stripe.com/apikeys",
  },
  {
    id: "groq",
    name: "Groq",
    desc: "Fast inference and model access",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://console.groq.com/keys",
    keyHint: "gsk_... Groq API key",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "openai",
    name: "OpenAI",
    desc: "Model access for completions and tools",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-... OpenAI API key",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    desc: "Claude model access and agent reasoning",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-... Anthropic API key",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "discord",
    name: "Discord",
    desc: "Community ops and bot automation",
    keyConnectable: true,
    oauthOnly: false,
    syncSupported: false,
    manageUrl: "https://discord.com/developers/applications",
    keyHint: "Discord bot token",
    keyUrl: "https://discord.com/developers/applications",
  },
  {
    id: "drive",
    name: "Cloud Drive",
    desc: "Docs, sheets, assets",
    keyConnectable: false,
    oauthOnly: true,
    syncSupported: false,
    manageUrl: "https://drive.google.com/drive/my-drive",
  },
  {
    id: "tiktok",
    name: "TikTok",
    desc: "Posting + drafts",
    keyConnectable: false,
    oauthOnly: true,
    syncSupported: false,
    manageUrl: "https://www.tiktok.com",
  },
  {
    id: "youtube",
    name: "YouTube",
    desc: "Uploads + analytics",
    keyConnectable: false,
    oauthOnly: true,
    syncSupported: false,
    manageUrl: "https://studio.youtube.com",
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Posts + stories",
    keyConnectable: false,
    oauthOnly: true,
    syncSupported: false,
    manageUrl: "https://business.instagram.com",
  },
];

/* ── Live validators ─────────────────────────────────────────────────── */

export interface ValidateOk {
  ok: true;
  meta: Record<string, unknown>;
}
export interface ValidateFail {
  ok: false;
  error: string;
}

export async function validateConnector(
  kind: ConnectorKind,
  apiKey: string,
): Promise<ValidateOk | ValidateFail> {
  if (kind === "github") return validateGithub(apiKey);
  if (kind === "linear") return validateLinear(apiKey);
  if (kind === "vercel") return validateVercel(apiKey);
  if (kind === "neon") return validateNeon(apiKey);
  if (kind === "telnyx") return validateTelnyx(apiKey);
  if (kind === "stripe") return validateStripe(apiKey);
  if (kind === "groq") return validateGroq(apiKey);
  if (kind === "openai") return validateOpenAI(apiKey);
  if (kind === "anthropic") return validateAnthropic(apiKey);
  if (kind === "discord") return validateDiscord(apiKey);
  return { ok: false, error: "This connector does not take a key." };
}

async function validateGithub(pat: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${GITHUB_API}/user`, {
      headers: {
        authorization: `Bearer ${pat}`,
        accept: "application/vnd.github+json",
        "user-agent": "OrethaAI",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401)
      return { ok: false, error: "GitHub rejected that token — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `GitHub error ${res.status} — try again shortly.` };
    const u = (await res.json()) as { login?: string; name?: string };
    if (!u.login) return { ok: false, error: "Unexpected GitHub response." };
    return { ok: true, meta: { login: u.login, name: u.name ?? null } };
  } catch {
    return { ok: false, error: "Couldn't reach GitHub — check your connection." };
  }
}

async function validateLinear(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(LINEAR_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: key,
      },
      body: JSON.stringify({ query: "{ viewer { id name email } }" }),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Linear rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Linear error ${res.status} — try again shortly.` };
    const j = (await res.json()) as {
      data?: { viewer?: { id: string; name?: string; email?: string } };
      errors?: unknown;
    };
    const viewer = j.data?.viewer;
    if (!viewer) return { ok: false, error: "Linear rejected that key." };
    return {
      ok: true,
      meta: { name: viewer.name ?? null, email: viewer.email ?? null },
    };
  } catch {
    return { ok: false, error: "Couldn't reach Linear — check your connection." };
  }
}

async function validateVercel(token: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${VERCEL_API}/v2/user`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Vercel rejected that token — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Vercel error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { user?: { id?: string; username?: string; email?: string; name?: string } };
    const user = j.user;
    if (!user?.id) return { ok: false, error: "Unexpected Vercel response." };
    return {
      ok: true,
      meta: { login: user.username ?? null, email: user.email ?? null, name: user.name ?? null },
    };
  } catch {
    return { ok: false, error: "Couldn't reach Vercel — check your connection." };
  }
}

async function validateNeon(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${NEON_API}/projects`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Neon rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Neon error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { projects?: Array<{ id?: string; name?: string }> };
    return {
      ok: true,
      meta: { projects: Array.isArray(j.projects) ? j.projects.length : 0, name: j.projects?.[0]?.name ?? null },
    };
  } catch {
    return { ok: false, error: "Couldn't reach Neon — check your connection." };
  }
}

async function validateTelnyx(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${TELNYX_API}/credential_connections?page[size]=1`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Telnyx rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Telnyx error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { data?: Array<{ id?: string; name?: string }> };
    return {
      ok: true,
      meta: { connections: Array.isArray(j.data) ? j.data.length : 0, name: j.data?.[0]?.name ?? null },
    };
  } catch {
    return { ok: false, error: "Couldn't reach Telnyx — check your connection." };
  }
}

async function validateStripe(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${STRIPE_API}/account`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Stripe rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Stripe error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { id?: string; email?: string; business_profile?: { name?: string } };
    if (!j.id) return { ok: false, error: "Unexpected Stripe response." };
    return {
      ok: true,
      meta: { name: j.business_profile?.name ?? null, email: j.email ?? null, accountId: j.id },
    };
  } catch {
    return { ok: false, error: "Couldn't reach Stripe — check your connection." };
  }
}

async function validateGroq(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${GROQ_API}/models`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Groq rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Groq error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { data?: Array<{ id?: string }> };
    return { ok: true, meta: { models: Array.isArray(j.data) ? j.data.length : 0 } };
  } catch {
    return { ok: false, error: "Couldn't reach Groq — check your connection." };
  }
}

async function validateOpenAI(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${OPENAI_API}/models`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "OpenAI rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `OpenAI error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { data?: Array<{ id?: string }> };
    return { ok: true, meta: { models: Array.isArray(j.data) ? j.data.length : 0 } };
  } catch {
    return { ok: false, error: "Couldn't reach OpenAI — check your connection." };
  }
}

async function validateAnthropic(key: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${ANTHROPIC_API}/models`, {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Anthropic rejected that key — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Anthropic error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { data?: Array<{ id?: string }> };
    return { ok: true, meta: { models: Array.isArray(j.data) ? j.data.length : 0 } };
  } catch {
    return { ok: false, error: "Couldn't reach Anthropic — check your connection." };
  }
}

async function validateDiscord(token: string): Promise<ValidateOk | ValidateFail> {
  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { authorization: token.startsWith("Bot ") ? token : `Bot ${token}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Discord rejected that bot token — check it and try again." };
    if (!res.ok)
      return { ok: false, error: `Discord error ${res.status} — try again shortly.` };
    const j = (await res.json()) as { username?: string; global_name?: string; id?: string };
    if (!j.id) return { ok: false, error: "Unexpected Discord response." };
    return { ok: true, meta: { login: j.username ?? null, name: j.global_name ?? null, accountId: j.id } };
  } catch {
    return { ok: false, error: "Couldn't reach Discord — check your connection." };
  }
}

/* ── Fetchers: remote items → normalized sync candidates ────────────── */

export interface RemoteWorkItem {
  remoteKey: string;
  title: string;
  url: string | null;
  lane: "In Progress" | "Waiting";
  priority: "high" | "med" | "low";
  meta: string;
}

export async function fetchWorkItems(
  kind: ConnectorKind,
  apiKey: string,
): Promise<{ items: RemoteWorkItem[]; error?: string }> {
  if (kind === "github") return fetchGithubItems(apiKey);
  if (kind === "linear") return fetchLinearItems(apiKey);
  return { items: [], error: "Sync not supported for this connector." };
}

interface GhSearchItem {
  id: number;
  title: string;
  html_url: string;
  state: string;
  updated_at: string;
  repository_url?: string;
  pull_request?: { url: string };
}

async function ghSearch(pat: string, q: string): Promise<GhSearchItem[]> {
  const url =
    `${GITHUB_API}/search/issues?q=${encodeURIComponent(q)}&per_page=20&sort=updated`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${pat}`,
      accept: "application/vnd.github+json",
      "user-agent": "OrethaAI",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`github ${res.status}`);
  const j = (await res.json()) as { items?: GhSearchItem[] };
  return j.items ?? [];
}

async function fetchGithubItems(
  pat: string,
): Promise<{ items: RemoteWorkItem[]; error?: string }> {
  try {
    const meRes = await fetch(`${GITHUB_API}/user`, {
      headers: {
        authorization: `Bearer ${pat}`,
        accept: "application/vnd.github+json",
        "user-agent": "OrethaAI",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!meRes.ok) return { items: [], error: `github auth ${meRes.status}` };
    const me = (await meRes.json()) as { login: string };

    const [assigned, reviewRequested] = await Promise.all([
      ghSearch(pat, `is:open assignee:${me.login} type:issue`),
      ghSearch(pat, `is:open review-requested:${me.login} type:pr`),
    ]);

    const items: RemoteWorkItem[] = [];
    for (const it of assigned) {
      items.push({
        remoteKey: `github:issue:${it.id}`,
        title: it.title,
        url: it.html_url,
        lane: "In Progress",
        priority: "med",
        meta: "Issue · assigned to you",
      });
    }
    for (const it of reviewRequested) {
      items.push({
        remoteKey: `github:pr:${it.id}`,
        title: `Review: ${it.title}`,
        url: it.html_url,
        lane: "Waiting",
        priority: "high",
        meta: "PR · review requested",
      });
    }
    return { items };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "github sync failed",
    };
  }
}

interface LinearIssue {
  id: string;
  title: string;
  url: string | null;
  priority: number;
  state?: { name?: string };
}

async function fetchLinearItems(
  key: string,
): Promise<{ items: RemoteWorkItem[]; error?: string }> {
  try {
    const res = await fetch(LINEAR_API, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: key },
      body: JSON.stringify({
        query:
          'query { viewer { assignedIssues(filter: { state: { type: { neq: "completed" } } }, first: 20, orderBy: updatedAt) { nodes { id title url priority state { name } } } } }',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { items: [], error: `linear ${res.status}` };
    const j = (await res.json()) as {
      data?: { viewer?: { assignedIssues?: { nodes?: LinearIssue[] } } };
      errors?: unknown;
    };
    const nodes = j.data?.viewer?.assignedIssues?.nodes ?? [];
    const items = nodes.map((n) => ({
      remoteKey: `linear:issue:${n.id}`,
      title: n.title,
      url: n.url,
      lane: "In Progress" as const,
      priority: (n.priority >= 2 ? "high" : n.priority === 0 ? "low" : "med") as
        | "high"
        | "med"
        | "low",
      meta: `Linear · ${n.state?.name ?? "open"}`,
    }));
    return { items };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "linear sync failed",
    };
  }
}

/* ── Sync engine: upsert remote items as board rows ─────────────────── */

export async function syncConnector(
  userId: string,
  kind: ConnectorKind,
): Promise<{ ok: boolean; items: number; created: number; error?: string }> {
  const entry = CONNECTOR_CATALOG.find((c) => c.id === kind);
  if (!entry?.syncSupported)
    return { ok: true, items: 0, created: 0 };

  const conn = await prisma.connector.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  if (!conn) return { ok: false, items: 0, created: 0, error: "not_connected" };

  const apiKey = decryptSecret({
    apiKeyCipher: conn.tokenCipher,
    iv: conn.iv,
    authTag: conn.authTag,
  });

  const { items, error } = await fetchWorkItems(kind, apiKey);
  if (error && items.length === 0) {
    await prisma.connector.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date(), lastSyncInfo: `error: ${error}` },
    });
    return { ok: false, items: 0, created: 0, error };
  }

  let created = 0;
  for (const item of items) {
    const existing = await prisma.task.findUnique({
      where: { userId_remoteKey: { userId, remoteKey: item.remoteKey } },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.task.create({
      data: {
        userId,
        title: item.title.slice(0, 160),
        source: kind === "github" ? "GitHub" : "Linear",
        lane: item.lane,
        priority: item.priority,
        remoteKey: item.remoteKey,
      },
    });
    created++;
  }

  await prisma.connector.update({
    where: { id: conn.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncInfo: `${items.length} item(s), ${created} new`,
    },
  });

  return { ok: true, items: items.length, created };
}

export async function syncAllConnectors(userId: string) {
  const syncKinds = new Set(
    CONNECTOR_CATALOG.filter((c) => c.syncSupported).map((c) => c.id),
  );
  const conns = await prisma.connector.findMany({
    where: { userId, kind: { in: [...syncKinds] } },
  });
  const results: { kind: string; ok: boolean; created: number; error?: string }[] =
    [];
  for (const c of conns) {
    const r = await syncConnector(userId, c.kind as ConnectorKind).catch(
      (e) => ({
        ok: false,
        items: 0,
        created: 0,
        error: e instanceof Error ? e.message : "sync failed",
      }),
    );
    results.push({ kind: c.kind, ok: r.ok, created: r.created, error: r.error });
  }
  return results;
}

/* ── Storage helpers ────────────────────────────────────────────────── */

export async function saveConnectorToken(
  userId: string,
  kind: ConnectorKind,
  apiKey: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const box = encryptSecret(apiKey);
  const entry = CONNECTOR_CATALOG.find((c) => c.id === kind);
  await prisma.connector.upsert({
    where: { userId_kind: { userId, kind } },
    create: {
      userId,
      kind,
      tokenCipher: box.apiKeyCipher,
      iv: box.iv,
      authTag: box.authTag,
      meta: JSON.stringify(meta),
      lastSyncInfo: entry?.syncSupported ? null : "Verified",
    },
    update: {
      tokenCipher: box.apiKeyCipher,
      iv: box.iv,
      authTag: box.authTag,
      meta: JSON.stringify(meta),
      lastSyncInfo: entry?.syncSupported ? null : "Verified",
    },
  });
}

export async function deleteConnector(
  userId: string,
  kind: ConnectorKind,
): Promise<void> {
  await prisma.connector.deleteMany({ where: { userId, kind } });
}
