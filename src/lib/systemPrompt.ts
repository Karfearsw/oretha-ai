import { prisma } from "@/lib/prisma";
import { AGENT_FILE_NAMES } from "@/lib/agentFiles";
import type { LlmMessage } from "@/lib/llm";

/**
 * Load the user's five bootstrap files and compose the system prompt in
 * OpenClaw's canonical order: IDENTITY → SOUL → USER → RULES → MEMORY.
 */
export async function buildSystemMessages(userId: string): Promise<LlmMessage[]> {
  const files = await prisma.agentFile.findMany({
    where: { userId, name: { in: [...AGENT_FILE_NAMES] } },
    select: { name: true, content: true },
  });

  const byName = new Map(files.map((f) => [f.name, f.content]));
  const ordered = AGENT_FILE_NAMES.map(
    (name) => byName.get(name) ?? `# ${name}\n(not set up yet)`,
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return [
    {
      role: "system",
      content: [
        "You are a personal AI agent inside Oretha AI — an uncensored, Black-powered agentic AI platform. You have a seat at the table, not a kiosk.",
        `Today is ${today}.`,
        "Your identity, soul, knowledge of your person, rules, and long-term memory follow. They are yours — speak from them as yourself, not as quoted documents.",
        ...ordered,
      ].join("\n\n---\n\n"),
    },
  ];
}
