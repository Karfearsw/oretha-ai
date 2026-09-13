/* ── Connectors: real integrations with user-stored keys ──────────────
 * GitHub (PAT) and Linear (API key) are fully functional: keys are
 * live-validated at connect time, AES-256-GCM-encrypted at rest, and
 * synced (assigned issues / review-requested PRs) onto the Task Board
 * as idempotent rows (unique per user + remoteKey).
 *
 * Email is special: "connected" means the user's AgentMail mailbox
 * exists — state derives from the Mailbox table, no token here.
 *
 * Social/drive connectors (tiktok, youtube, instagram, drive) require
 * per-app OAuth; they are catalog entries with available=false until an
 * Oretha OAuth app exists for them.
 */

import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/agentmail";

const GITHUB_API = (
  process.env.GITHUB_API_BASE ?? "https://api.github.com"
).replace(/\/+$/, "");
const LINEAR_API = (
  process.env.LINEAR_API_BASE ?? "https://api.linear.app/graphql"
).replace(/\/+$/, "");

export type ConnectorKind =
  | "github"
  | "linear"
  | "email"
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
    keyHint: "ghp_… token with repo + reads",
    keyUrl: "https://github.com/settings/tokens/new?scopes=repo,read:user",
  },
  {
    id: "linear",
    name: "Linear",
    desc: "Assigned issues → task board",
    keyConnectable: true,
    oauthOnly: false,
    keyHint: "lin_api_… key",
    keyUrl: "https://linear.app/settings/api",
  },
  {
    id: "email",
    name: "Email",
    desc: "Inbox triage + task intake (agent mailroom)",
    keyConnectable: false,
    oauthOnly: false,
  },
  {
    id: "drive",
    name: "Cloud Drive",
    desc: "Docs, sheets, assets",
    keyConnectable: false,
    oauthOnly: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    desc: "Posting + drafts",
    keyConnectable: false,
    oauthOnly: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    desc: "Uploads + analytics",
    keyConnectable: false,
    oauthOnly: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Posts + stories",
    keyConnectable: false,
    oauthOnly: true,
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
  const conns = await prisma.connector.findMany({ where: { userId } });
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
  await prisma.connector.upsert({
    where: { userId_kind: { userId, kind } },
    create: {
      userId,
      kind,
      tokenCipher: box.apiKeyCipher,
      iv: box.iv,
      authTag: box.authTag,
      meta: JSON.stringify(meta),
    },
    update: {
      tokenCipher: box.apiKeyCipher,
      iv: box.iv,
      authTag: box.authTag,
      meta: JSON.stringify(meta),
    },
  });
}

export async function deleteConnector(
  userId: string,
  kind: ConnectorKind,
): Promise<void> {
  await prisma.connector.deleteMany({ where: { userId, kind } });
}
