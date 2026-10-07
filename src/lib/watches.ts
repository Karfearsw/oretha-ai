/* ── Page watches: recurring checks of a public URL ───────────────────
 * The sweeper finds due watches and runs `checkWatch`, which fetches the
 * page through the shared SSRF-guarded fetcher and evaluates one of:
 *
 *   change → alert when the normalized-text hash differs from lastHash
 *   text   → alert when `needle` appears on the page
 *   price  → alert when a USD amount ≤ threshold, or the price dropped
 *
 * Every alert is a Task row with remoteKey `watch:<id>:<alertKey>`, so the
 * Task table's @@unique([userId, remoteKey]) deduplicates repeat alerts —
 * the same condition can never stack twice on the board.
 *
 * Failures grow `failCount`, which backs the next check off exponentially
 * (base interval × 2^failCount, capped at 7 days). A successful check
 * resets it to 0.
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchPage, validateUrl } from "@/lib/pageFetch";

const BASE_INTERVAL: Record<string, number> = {
  hourly: 3_600_000,
  daily: 86_400_000,
};
const MAX_BACKOFF_MS = 7 * 86_400_000; // 7 days

export type WatchKind = "change" | "text" | "price";

export interface WatchInput {
  name: string;
  url: string;
  kind: WatchKind;
  needle?: string | null;
  threshold?: number | null;
  schedule?: string;
}

export interface WatchCheckResult {
  ok: boolean;
  status: "alert" | "no_change" | "no_match" | "error";
  message: string;
  alerted?: boolean; // false when an identical alert already existed (dedup)
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

/** Normalize text for change-hashing: collapse whitespace, drop nothing
 * else. Part of the watch comparison policy — it lives here next to the
 * hash it feeds. */
export function normalizeForHash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** First USD amount on the page, or null. Handles $1,299.00 / $42 / USD 42. */
function extractPrice(text: string): number | null {
  const m = text.match(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  const m2 = text.match(/USD\s?(\d+(?:\.\d{1,2})?)/i);
  if (m2) {
    const n = Number(m2[1]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Create an alert task, deduped by remoteKey. Returns true if newly created. */
async function raiseAlert(
  userId: string,
  watch: { id: string; name: string },
  alertKey: string,
  title: string,
  priority: "high" | "med" = "med",
): Promise<boolean> {
  const remoteKey = `watch:${watch.id}:${alertKey}`;
  const existing = await prisma.task.findFirst({
    where: { userId, remoteKey },
    select: { id: true },
  });
  if (existing) return false;
  await prisma.task.create({
    data: {
      userId,
      title: title.slice(0, 200),
      source: "Watch",
      lane: "In Progress",
      assigneeId: "oretha",
      priority,
      remoteKey,
    },
  });
  return true;
}

/** Evaluate one fetched page against a watch and persist state + alerts. */
export async function checkWatch(
  userId: string,
  watch: {
    id: string;
    name: string;
    url: string;
    kind: string;
    needle: string | null;
    threshold: number | null;
    lastHash: string | null;
    lastValue: string | null;
  },
): Promise<WatchCheckResult> {
  const page = await fetchPage(watch.url);
  if (!page.ok || !page.text) {
    const message = page.error || "Couldn't read that page.";
    await prisma.watch.update({
      where: { id: watch.id },
      data: {
        lastCheckAt: new Date(),
        lastStatus: "error",
        lastError: message.slice(0, 300),
        failCount: { increment: 1 },
      },
    });
    return { ok: false, status: "error", message };
  }

  const text = normalizeForHash(page.text);
  const newHash = hash(text);
  let result: WatchCheckResult;

  if (watch.kind === "change") {
    if (watch.lastHash && watch.lastHash === newHash) {
      result = { ok: true, status: "no_change", message: "No change since the last check." };
    } else if (!watch.lastHash) {
      result = { ok: true, status: "no_change", message: "Baseline recorded — next change will alert." };
    } else {
      const created = await raiseAlert(
        userId,
        watch,
        newHash,
        `Watch "${watch.name}" changed — ${page.title || watch.url}`,
        "med",
      );
      result = {
        ok: true,
        status: "alert",
        alerted: created,
        message: created
          ? "Page changed — alert on the board."
          : "Page changed (alert already on the board).",
      };
    }
  } else if (watch.kind === "text") {
    const needle = (watch.needle || "").trim();
    if (!needle) {
      result = { ok: false, status: "error", message: "This watch has no text to look for." };
    } else {
      const found = text.toLowerCase().includes(needle.toLowerCase());
      if (!found) {
        result = { ok: true, status: "no_match", message: `“${needle}” isn't on the page yet.` };
      } else {
        const created = await raiseAlert(
          userId,
          watch,
          hash(needle.toLowerCase()),
          `Watch "${watch.name}": “${needle}” is on the page — ${page.title || watch.url}`,
          "med",
        );
        result = {
          ok: true,
          status: "alert",
          alerted: created,
          message: created
            ? `Found “${needle}” — alert on the board.`
            : `Found “${needle}” (alert already on the board).`,
        };
      }
    }
  } else {
    // price
    const price = extractPrice(page.text);
    if (price === null) {
      result = { ok: false, status: "error", message: "No USD price found on that page." };
    } else {
      const prev = watch.lastValue ? Number(watch.lastValue) : null;
      const thresholdHit =
        watch.threshold !== null && price <= watch.threshold;
      const dropped = prev !== null && Number.isFinite(prev) && price < prev;
      if (thresholdHit || dropped) {
        const created = await raiseAlert(
          userId,
          watch,
          thresholdHit ? `t${watch.threshold}` : `p${price}`,
          thresholdHit
            ? `Watch "${watch.name}": price $${price.toFixed(2)} ≤ your $${watch.threshold} threshold`
            : `Watch "${watch.name}": price dropped $${(prev as number).toFixed(2)} → $${price.toFixed(2)}`,
          "high",
        );
        result = {
          ok: true,
          status: "alert",
          alerted: created,
          message: created
            ? `Price $${price.toFixed(2)} — alert on the board.`
            : `Price $${price.toFixed(2)} (alert already on the board).`,
        };
      } else {
        result = {
          ok: true,
          status: "no_change",
          message: `Price $${price.toFixed(2)} — no alert condition met.`,
        };
      }
    }
  }

  await prisma.watch.update({
    where: { id: watch.id },
    data: {
      lastCheckAt: new Date(),
      lastStatus: result.status === "error" ? "error" : result.status === "alert" ? "alert" : "ok",
      lastError: result.status === "error" ? result.message.slice(0, 300) : null,
      lastHash: newHash,
      lastValue:
        watch.kind === "price"
          ? (() => {
              const p = extractPrice(page.text);
              return p === null ? watch.lastValue : String(p);
            })()
          : watch.lastValue,
      failCount: result.status === "error" ? { increment: 1 } : 0,
    },
  });
  return result;
}

/** Next-due timestamp with exponential backoff on failures. */
export function nextDueAt(watch: {
  lastCheckAt: Date | null;
  schedule: string;
  failCount: number;
}): Date {
  const base = BASE_INTERVAL[watch.schedule] ?? BASE_INTERVAL.daily;
  const backoff = Math.min(base * 2 ** Math.min(watch.failCount, 10), MAX_BACKOFF_MS);
  const from = watch.lastCheckAt ?? new Date(0);
  return new Date(from.getTime() + backoff);
}

export function isWatchDue(watch: {
  lastCheckAt: Date | null;
  schedule: string;
  failCount: number;
}): boolean {
  return nextDueAt(watch).getTime() <= Date.now();
}

/**
 * Create a watch from chat/tools/API. Validates input, enforces the cap,
 * and returns the created row (or `{ error }`).
 */
export async function createWatch(
  userId: string,
  input: WatchInput,
): Promise<{ id: string; name: string; kind: string } | { error: string }> {
  const name = input.name.trim().slice(0, 80);
  const url = input.url.trim();
  if (!name) return { error: "Give the watch a name." };
  if (!url) return { error: "Missing URL." };

  const blocked = validateUrl(url);
  if (blocked) return { error: blocked };

  const kind: WatchKind =
    input.kind === "text" || input.kind === "price" ? input.kind : "change";
  if (kind === "text" && !(input.needle || "").trim())
    return { error: "Text watches need something to look for." };
  if (kind === "price" && (input.threshold === null || input.threshold === undefined))
    return { error: "Price watches need a threshold." };

  const count = await prisma.watch.count({ where: { userId } });
  if (count >= 30) return { error: "Watch cap reached (30). Delete one first." };

  const created = await prisma.watch.create({
    data: {
      userId,
      name,
      url,
      kind,
      needle: kind === "text" ? input.needle!.trim().slice(0, 200) : null,
      threshold: kind === "price" ? input.threshold! : null,
      schedule: input.schedule === "hourly" ? "hourly" : "daily",
    },
  });
  return { id: created.id, name: created.name, kind: created.kind };
}

/**
 * Sweep every user's due watches. Called by the cron endpoint and the
 * local interval sweeper alongside the workflow sweep. Never throws.
 */
export async function sweepDueWatches(): Promise<{
  checked: number;
  executed: number;
  alerts: number;
  errors: number;
}> {
  const all = await prisma.watch.findMany({
    where: { enabled: true },
    select: {
      id: true,
      userId: true,
      name: true,
      url: true,
      kind: true,
      needle: true,
      threshold: true,
      lastHash: true,
      lastValue: true,
      lastCheckAt: true,
      schedule: true,
      failCount: true,
    },
  });

  const stats = { checked: 0, executed: 0, alerts: 0, errors: 0 };
  for (const w of all) {
    stats.checked++;
    if (!isWatchDue(w)) continue;
    stats.executed++;
    try {
      const r = await checkWatch(w.userId, w);
      if (r.status === "alert" && r.alerted) stats.alerts++;
      if (r.status === "error") stats.errors++;
    } catch {
      stats.errors++;
      // checkWatch itself doesn't throw normally, but a DB failure here
      // must not kill the sweep for the remaining watches.
      await prisma.watch
        .update({
          where: { id: w.id },
          data: { failCount: { increment: 1 }, lastStatus: "error", lastCheckAt: new Date() },
        })
        .catch(() => {});
    }
  }
  return stats;
}
