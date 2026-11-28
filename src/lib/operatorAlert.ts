/* ── Operator alerting (Epic 0 / R0.4) ───────────────────────────────
 * When provider billing fails, the OPERATOR gets paged — not the user.
 * Channel: a Discord webhook from DISCORD_ALERT_WEBHOOK_URL (env).
 * No webhook configured → alerts are logged server-side and reported
 * as not_configured. Nothing is invented: no channel, no alert.
 *
 * Payloads carry provider + status + code only. Never a key, never a
 * raw provider body.
 *
 * Cooldown (one alert per code per 10 minutes) lives in the database
 * (AlertCooldown), NOT in module memory: Next.js route bundles each
 * carry their own module instance, so an in-memory map cannot dedupe
 * a chat 402 against a workflow 402. The slot is reserved before the
 * webhook POST, so concurrent failures page once instead of once per
 * call site.
 */

import { prisma } from "@/lib/prisma";
import { toProviderError } from "@/lib/providerErrors";

export interface OperatorAlertResult {
  sent: boolean;
  channel: "discord" | "none";
  reason?: string;
}

const COOLDOWN_MS = 10 * 60_000;

export async function notifyOperator(opts: {
  code: string;
  title: string;
  detail: string;
}): Promise<OperatorAlertResult> {
  // Server log always — the alert exists even with no webhook wired.
  console.error(`[operator-alert] ${opts.code}: ${opts.title} — ${opts.detail}`);

  // Reserve the cooldown slot atomically: one UPSERT whose WHERE only
  // matches when the stored timestamp is stale. A concurrent failure
  // for the same code reads 0 affected rows and stands down — a plain
  // read-then-write would let both through in the same millisecond.
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - COOLDOWN_MS).toISOString();
    const affected = await prisma.$executeRaw`
      INSERT INTO "AlertCooldown" ("code", "lastSentAt")
      VALUES (${opts.code}, ${now.toISOString()})
      ON CONFLICT("code") DO UPDATE SET "lastSentAt" = ${now.toISOString()}
      WHERE "AlertCooldown"."lastSentAt" < ${cutoff}
    `;
    if (affected === 0) {
      return { sent: false, channel: "discord", reason: "cooldown" };
    }
  } catch (err) {
    // If the cooldown table is unavailable (migration not yet applied),
    // fall through and send — a missing cooldown must never silence
    // a billing alert.
    console.error("[operator-alert] cooldown check failed, sending anyway:", err);
  }

  const url = (process.env.DISCORD_ALERT_WEBHOOK_URL ?? "").trim();
  if (!url) {
    return { sent: false, channel: "none", reason: "no_webhook_configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content:
          `🚨 Oretha — ${opts.title}\n${opts.detail}\nCode: ${opts.code}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { sent: false, channel: "discord", reason: `webhook_${res.status}` };
    }
    return { sent: true, channel: "discord" };
  } catch {
    return { sent: false, channel: "discord", reason: "webhook_unreachable" };
  }
}

/**
 * Record a provider failure from real traffic. Billing and quota
 * failures page the operator immediately; anything else stays in the
 * server log. Never throws.
 */
export async function recordProviderFailure(
  err: unknown,
  where: string,
): Promise<void> {
  try {
    const pe = toProviderError(err);
    if (pe.code !== "billing" && pe.code !== "rate_limited") return;
    await notifyOperator({
      code: pe.code,
      title:
        pe.code === "billing"
          ? "Provider billing failed (402)"
          : "Provider quota hit (429)",
      detail:
        `${where}: ${pe.provider} returned ` +
        `${pe.status === null ? "no status" : `HTTP ${pe.status}`} (${pe.code}). ` +
        "Chat and workflow runs will fail until billing is fixed — see RDP Epic 0.",
    });
  } catch {
    /* alerting must never break the request it reports on */
  }
}
