/* ── KEVO mailroom: inbox sync + agent triage ─────────────────────────
 * Pulls recent messages from the user's AgentMail inbox, then asks the
 * LLM to triage each new one: turn it into a task, draft a reply, or
 * archive it. Results land in EmailMessage and surface on the Task Board.
 */

import { prisma } from "@/lib/prisma";
import { chatComplete } from "@/lib/llm";
import { amListMessages, decryptSecret } from "@/lib/agentmail";
import type { Mailbox } from "@/generated/prisma/client";

const MAX_TRIAGE_PER_SYNC = 10;

interface TriageVerdict {
  action: "task" | "reply" | "archive";
  task_title?: string;
  lane?: "In Progress" | "Waiting" | "Done";
  priority?: "high" | "med" | "low";
  due_days?: number;
  reply?: string;
  reason?: string;
}

function parseVerdict(raw: string): TriageVerdict | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const v = JSON.parse(match[0]) as TriageVerdict;
    if (!["task", "reply", "archive"].includes(v.action)) return null;
    return v;
  } catch {
    return null;
  }
}

function dueFromDays(days: number | undefined): string {
  const d = new Date(Date.now() + Math.min(Math.max(days ?? 3, 0), 60) * 86400_000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Triage a single email. Never throws — returns null on failure. */
async function triageOne(
  ctx: { agentName: string; ownerName: string; ownerWork: string | null; userId: string },
  email: { from: string; subject: string; preview: string },
): Promise<TriageVerdict | null> {
  const raw = await chatComplete(
    [
      {
        role: "system",
        content:
          `You are the mailroom triage module for ${ctx.agentName}, an AI agent working for ${ctx.ownerName}` +
          (ctx.ownerWork ? ` (${ctx.ownerWork})` : "") +
          `. Classify one inbound email and respond with ONLY a JSON object, no prose:
{"action":"task"|"reply"|"archive",
 "task_title":"short imperative task title (only if action=task)",
 "lane":"In Progress"|"Waiting"|"Done",
 "priority":"high"|"med"|"low",
 "due_days":3,
 "reply":"draft reply text (only if action=reply)",
 "reason":"one short line explaining the call"}`.replace(/\n/g, " "),
      },
      {
        role: "user",
        content: `From: ${email.from}\nSubject: ${email.subject}\n\n${email.preview}`,
      },
    ],
    { maxTokens: 300, temperature: 0, userId: ctx.userId },
  );
  return parseVerdict(raw);
}

/**
 * Sync + triage one mailbox. Returns how many new emails were processed.
 * Each new email gets an LLM verdict; `task` verdicts create Task rows
 * owned by the mailroom agent card.
 */
export async function syncMailbox(
  mailbox: Mailbox,
  ctx: {
    agentName: string;
    ownerName: string;
    ownerWork: string | null;
    userId: string;
  },
): Promise<{ fetched: number; triaged: number; tasks: number }> {
  const apiKey = decryptSecret(mailbox);
  const incoming = await amListMessages(apiKey, mailbox.inboxId, 25);

  const existing = new Set(
    (
      await prisma.emailMessage.findMany({
        where: { mailboxId: mailbox.id },
        select: { remoteId: true },
      })
    ).map((e) => e.remoteId),
  );

  const fresh = incoming.filter((m) => !existing.has(m.id));
  const toTriage = fresh.slice(0, MAX_TRIAGE_PER_SYNC);

  let tasks = 0;
  for (const m of toTriage) {
    const verdict = await triageOne(ctx, m).catch(() => null);

    const mailRow = await prisma.emailMessage.create({
      data: {
        mailboxId: mailbox.id,
        remoteId: m.id,
        fromAddr: m.from.slice(0, 320),
        subject: m.subject.slice(0, 300),
        preview: m.preview,
        receivedAt: m.receivedAt,
        triaged: verdict !== null,
        action: verdict?.action ?? null,
        taskTitle: verdict?.task_title ?? null,
      },
    });

    if (verdict?.action === "task" && verdict.task_title) {
      tasks++;
      await prisma.task.create({
        data: {
          userId: mailbox.userId,
          title: verdict.task_title.slice(0, 160),
          source: "Email",
          lane: ["In Progress", "Waiting", "Done"].includes(verdict.lane ?? "")
            ? (verdict.lane as "In Progress" | "Waiting" | "Done")
            : "In Progress",
          assigneeId: "mailroom",
          priority: ["high", "med", "low"].includes(verdict.priority ?? "")
            ? (verdict.priority as "high" | "med" | "low")
            : "med",
          due: dueFromDays(verdict.due_days),
          emailId: mailRow.id,
        },
      });
    }
  }

  await prisma.mailbox.update({
    where: { id: mailbox.id },
    data: { lastSyncAt: new Date() },
  });

  return { fetched: incoming.length, triaged: toTriage.length, tasks };
}

/** Convenience: sync every mailbox the user owns. */
export async function syncAllMailboxes(
  userId: string,
  ctx: { agentName: string; ownerName: string; ownerWork: string | null },
) {
  const mailboxes = await prisma.mailbox.findMany({ where: { userId } });
  const results = [];
  for (const box of mailboxes) {
    try {
      results.push({
        inboxId: box.inboxId,
        ...(await syncMailbox(box, { ...ctx, userId })),
      });
    } catch (err) {
      results.push({
        inboxId: box.inboxId,
        fetched: 0,
        triaged: 0,
        tasks: 0,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }
  return results;
}
