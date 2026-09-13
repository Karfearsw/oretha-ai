import { prisma } from "@/lib/prisma";
import { chatComplete, llmConfigured, type LlmMessage } from "@/lib/llm";

/* ── Oretha's learning loop ──────────────────────────────────────────
 * After each exchange, a background call extracts durable facts from
 * the recent conversation and merges them into the user's MEMORY.md.
 * The model does the judging (what's durable?); the code guarantees
 * the file shape (append under ## Facts, dedupe, condense when huge).
 */

const MAX_MEMORY_CHARS = 8000;
const CONDENSED_FACT_TARGET = 20;
const MAX_EXTRACTED_FACTS = 5;

/** Fire-and-forget: extract + merge durable facts after an exchange. */
export function scheduleMemoryUpdate(
  userId: string,
  exchange: LlmMessage[],
): void {
  void updateMemory(userId, exchange).catch((err) =>
    console.error("[memory] background update failed:", err),
  );
}

export async function updateMemory(
  userId: string,
  exchange: LlmMessage[],
): Promise<void> {
  const file = await prisma.agentFile.findUnique({
    where: { userId_name: { userId, name: "MEMORY.md" } },
    select: { id: true, content: true },
  });
  if (!file || !llmConfigured()) return;

  const transcript = exchange
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
    .join("\n");

  const extracted = await chatComplete(
    [
      {
        role: "system",
        content:
          "You maintain long-term memory for a personal AI agent. From this exchange, list only durable facts worth remembering months from now: identity, projects, people, deadlines, commitments, preferences, standing decisions. Max 5. Skip small talk, plans that just happened, and anything already in memory. Reply with one fact per line starting with '- '. If there is nothing durable, reply exactly NO_MEMORY.",
      },
      {
        role: "user",
        content: `CURRENT MEMORY.md:\n${file.content}\n\nEXCHANGE:\n${transcript}`,
      },
    ],
    { maxTokens: 300, temperature: 0 },
  );

  const newFacts = extracted
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && !/^NO_MEMORY$/i.test(l))
    .slice(0, MAX_EXTRACTED_FACTS);
  if (newFacts.length === 0) return;

  await prisma.agentFile.update({
    where: { id: file.id },
    data: { content: await mergeMemory(file.content, newFacts) },
  });
}

/** Append facts under ## Facts, dedupe, consolidate when the file gets huge. */
async function mergeMemory(current: string, facts: string[]): Promise<string> {
  const lines = current.split("\n");
  const factsIdx = lines.findIndex((l) => l.trim() === "## Facts");
  if (factsIdx === -1) {
    return `${current.trimEnd()}\n\n## Facts\n${facts.map((f) => `- ${f}`).join("\n")}\n`;
  }

  const existing = new Set(
    lines
      .filter((l) => l.trimStart().startsWith("- "))
      .map((l) => normalize(l)),
  );

  const fresh = facts
    .filter((f) => !existing.has(normalize(f)))
    .map((f) => `- ${f}`);

  if (fresh.length === 0) return current;

  let insertAt = factsIdx + 1;
  while (
    insertAt < lines.length &&
    lines[insertAt].trim() !== "" &&
    !lines[insertAt].trim().startsWith("## ")
  ) {
    insertAt++;
  }

  let next = [...lines.slice(0, insertAt), ...fresh, ...lines.slice(insertAt)];

  // Consolidate when the file grows past the char budget — never silently drop.
  if (next.join("\n").length > MAX_MEMORY_CHARS) {
    next = await consolidateFacts(next, factsIdx).catch(() =>
      truncateFacts(next, factsIdx),
    );
  }
  return next.join("\n");
}

const STOP = new Set(["the", "a", "an", "her", "his", "their", "my"]);

function normalize(line: string): string {
  const words = line
    .toLowerCase()
    .replace(/^-\s*/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  return words.sort().join(" ");
}

/** Ask the model to consolidate the fact list; fall back to truncation. */
async function consolidateFacts(
  lines: string[],
  factsIdx: number,
): Promise<string[]> {
  let end = factsIdx + 1;
  while (
    end < lines.length &&
    lines[end].trim() !== "" &&
    !lines[end].trim().startsWith("## ")
  ) {
    end++;
  }
  const factLines = lines.slice(factsIdx + 1, end);

  const consolidated = await chatComplete(
    [
      {
        role: "system",
        content:
          "Consolidate this list of memory facts for a personal AI agent: merge duplicates and related items, keep every distinct fact, max 20 lines, one fact per line starting with '- '. Preserve names, numbers, dates. Reply with the list only.",
      },
      { role: "user", content: factLines.join("\n") },
    ],
    { maxTokens: 600, temperature: 0 },
  );

  const merged = consolidated
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
  if (merged.length === 0) throw new Error("consolidation returned nothing");

  return [...lines.slice(0, factsIdx + 1), ...merged, ...lines.slice(end)];
}

/** Last-resort bound if consolidation fails: keep the newest facts. */
function truncateFacts(lines: string[], factsIdx: number): string[] {
  let end = factsIdx + 1;
  while (
    end < lines.length &&
    lines[end].trim() !== "" &&
    !lines[end].trim().startsWith("## ")
  ) {
    end++;
  }
  const kept = lines.slice(factsIdx + 1, end).slice(-CONDENSED_FACT_TARGET);
  return [...lines.slice(0, factsIdx + 1), ...kept, ...lines.slice(end)];
}
