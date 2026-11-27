/**
 * Prompt Forge — pure client-side helpers.
 *
 * Turns a rough one-liner into a strong brief using Anthropic's 4-part
 * framework (Job / Why / Guardrails / Done). No backend, no network.
 * Source research: ~/workspace/research_notes/prompt-forge-20261127/report.md
 */

export type ForgeMode = "general" | "task" | "bmad";

export type ForgePart = "job" | "why" | "guardrails" | "done";

export interface PartScore {
  /** 0 – 2.5 */
  score: number;
  note: string;
}

export interface PromptScore {
  /** 0 – 10, rounded to the nearest 0.5 */
  total: number;
  parts: Record<ForgePart, PartScore>;
  /** Pattern flags, e.g. "bare link", "one-word prompt" */
  flags: string[];
}

export interface ForgeFields {
  job: string;
  why: string;
  guardrails: string;
  done: string;
  role?: string;
  deadline?: string;
  owner?: string;
  context?: string;
}

export const PART_LABELS: Record<ForgePart, string> = {
  job: "The job",
  why: "The why",
  guardrails: "Guardrails",
  done: "What done looks like",
};

const PART_ORDER: ForgePart[] = ["job", "why", "guardrails", "done"];

const ACTION_VERBS =
  /\b(build|make|create|write|draft|produce|generate|fix|update|design|plan|find|search|compare|analyse|analyze|summarize|summarise|list|show|chart|post|send|book|check|review|turn|convert|add|remove|improve|research|test|run|deploy|launch)\b/i;

const WHY_SIGNALS = [
  /\bbecause\b/i,
  /\bso that\b/i,
  /\bin order to\b/i,
  /\bso i can\b/i,
  /\bso we can\b/i,
  /\bto help (me|us|him|her|them)\b/i,
  /\bthe reason\b/i,
  /\bthat way\b/i,
];

const GUARDRAIL_SIGNALS = [
  /\bdon't\b/i,
  /\bdo not\b/i,
  /\bnever\b/i,
  /\bmust not\b/i,
  /\bavoid\b/i,
  /\bonly\b/i,
  /\bkeep it\b/i,
  /\bnot (too|more than|longer than)\b/i,
  /\bno (paper|extra|made-up|fake)\b/i,
];

const DONE_SIGNALS = [
  /\bdone means\b/i,
  /\bcheck (that|it|the)\b/i,
  /\bverify\b/i,
  /\bconfirm\b/i,
  /\bshould (look|read|include|have)\b/i,
  /\bmust include\b/i,
  /\blook like\b/i,
  /\bbefore (you )?(stop|finish|send)\b/i,
  /\bpass(es)?\b/i,
];

const EMPHATIC = /\b(CRITICAL|MUST|IMPORTANT|URGENT|ALWAYS|NEVER)\b/;

function countHits(text: string, patterns: RegExp[]): number {
  let hits = 0;
  for (const p of patterns) {
    if (p.test(text)) hits += 1;
  }
  return hits;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Score a prompt on the 4-part brief. Each part is 0–2.5; total is 0–10.
 * Heuristic by design: it catches missing parts, not perfect prose.
 */
export function scorePrompt(raw: string): PromptScore {
  const text = raw.trim();
  const flags: string[] = [];

  if (!text) {
    return {
      total: 0,
      parts: {
        job: { score: 0, note: "No job stated — say what you want done." },
        why: { score: 0, note: "No reason given." },
        guardrails: { score: 0, note: "No guardrails set." },
        done: { score: 0, note: "No done-check — how will you know it worked?" },
      },
      flags: ["empty prompt"],
    };
  }

  const isBareLink = /^https?:\/\/\S+$/.test(text) || /^www\.\S+$/.test(text);
  if (isBareLink) flags.push("bare link — no job, no why, no done-check");

  const words = wordCount(text);
  if (words <= 1) flags.push("one-word prompt — the AI has to guess everything");
  if (words <= 4 && !isBareLink) flags.push("one-liner — add the job, the why, and a done-check");
  if (EMPHATIC.test(text)) flags.push("ALL-CAPS emphasis (CRITICAL / MUST) makes new models overdo it");
  if (/\bum\b|\buh\b/.test(text)) flags.push("voice-transcription filler — check the words before sending");
  if ((text.match(/\?/g) ?? []).length >= 2) flags.push("two questions fused into one message — split them");

  // --- Job ---
  let job = 0;
  let jobNote = "No clear job — describe the whole task, not one step.";
  const hasVerb = ACTION_VERBS.test(text);
  if (isBareLink) {
    job = 0;
    jobNote = "A link alone is not a job — say what to do with it.";
  } else if (words <= 2) {
    job = 0.5;
    jobNote = "Too short to be a job — what exactly should happen?";
  } else if (words <= 8) {
    job = hasVerb ? 1 : 0.5;
    jobNote = "Job is vague — name the whole task in one sentence.";
  } else if (words <= 20) {
    job = hasVerb ? 1.5 : 1;
    jobNote = "Job is roughly there — tighten it to one clear sentence.";
  } else if (words <= 40) {
    job = hasVerb ? 2 : 1.5;
    jobNote = "Job reads clearly.";
  } else {
    job = hasVerb ? 2.5 : 2;
    jobNote = "Job is specific and complete.";
  }

  // --- Why ---
  const whyHits = countHits(text, WHY_SIGNALS);
  let why = 0;
  let whyNote = "No reason given — the AI can't make small calls the way you would.";
  if (whyHits >= 2) {
    why = 2.5;
    whyNote = "Reason is clear — the AI can decide the small stuff your way.";
  } else if (whyHits === 1) {
    why = 1.5;
    whyNote = "A reason is in there — say it plainly so it survives a long task.";
  }

  // --- Guardrails ---
  const guardHits = countHits(text, GUARDRAIL_SIGNALS);
  let guardrails = 0;
  let guardrailsNote = "No guardrails — say what it must not touch or do.";
  if (guardHits >= 2) {
    guardrails = 2.5;
    guardrailsNote = "Guardrails are set.";
  } else if (guardHits === 1) {
    guardrails = 1.5;
    guardrailsNote = "One guardrail — add the one that matters most if it goes wrong.";
  }

  // --- Done ---
  const doneHits = countHits(text, DONE_SIGNALS);
  let done = 0;
  let doneNote = "No done-check — the AI stops when it thinks it's done, which is a guess.";
  if (doneHits >= 2) {
    done = 2.5;
    doneNote = "Done is defined with checks.";
  } else if (doneHits === 1) {
    done = 1.5;
    doneNote = "A hint of done — add one check it must pass before stopping.";
  }

  const total = Math.min(10, Math.round((job + why + guardrails + done) * 2) / 2);

  return {
    total,
    parts: {
      job: { score: job, note: jobNote },
      why: { score: why, note: whyNote },
      guardrails: { score: guardrails, note: guardrailsNote },
      done: { score: done, note: doneNote },
    },
    flags,
  };
}

/** Split free text into numbered requirements (FR-01, FR-02, …). */
function splitRequirements(text: string): string[] {
  return text
    .split(/\n|;(?=\s*[A-Z(])/)
    .map((s) => s.replace(/^[-•\d.)\s]+/, "").trim())
    .filter((s) => s.length > 1);
}

function numbered(prefix: string, items: string[]): string {
  return items
    .map((item, i) => `${prefix}-${String(i + 1).padStart(2, "0")} — ${item}`)
    .join("\n");
}

function section(title: string, body: string): string {
  return body.trim() ? `## ${title}\n${body.trim()}\n` : "";
}

export function buildGeneral(f: ForgeFields): string {
  const lines: string[] = [];
  if (f.role) lines.push(`You are ${f.role}.`);
  lines.push(`**Job:** ${f.job || "(describe the whole task)"}`);
  if (f.why) lines.push(`**Why:** ${f.why}`);
  if (f.guardrails) lines.push(`**Guardrails:** ${f.guardrails}`);
  if (f.done) lines.push(`**Done means:** ${f.done}`);
  if (f.deadline) lines.push(`**Deadline:** ${f.deadline}`);
  if (f.context) lines.push(`**Context:** ${f.context}`);
  lines.push(`Do not stop until every done-check passes. If anything above is unclear, ask one question before starting.`);
  return lines.join("\n");
}

export function buildTask(f: ForgeFields): string {
  const parts: string[] = [];
  parts.push(`# Task brief`);
  if (f.role) parts.push(`**Owner:** ${f.owner || f.role}`);
  if (f.deadline) parts.push(`**Deadline:** ${f.deadline}`);
  parts.push(section("Job", f.job || "(describe the whole task)"));
  parts.push(section("Why", f.why));
  parts.push(section("Guardrails", f.guardrails));
  parts.push(section("Done-checks", f.done));
  if (f.context) parts.push(section("Context", f.context));
  parts.push(
    `## Verify\nBefore marking this done, re-read the done-checks above and confirm each one passes. If a check fails, fix it — do not report it as done.`,
  );
  return parts.filter(Boolean).join("\n");
}

export function buildBmad(f: ForgeFields): string {
  const reqs = splitRequirements(f.job);
  const jobReqs = reqs.length > 0 ? reqs : [f.job || "(describe the whole task)"];
  const nfrs = f.guardrails
    ? splitRequirements(f.guardrails)
    : ["No invented prices, addresses, or percentages — every number must come from a real source."];
  const doneChecks = f.done
    ? splitRequirements(f.done)
    : ["Every requirement below is met and verifiable."];

  const out: string[] = [];
  out.push(`# BMAD Build Brief`);
  if (f.role) out.push(`**Role:** ${f.role}`);
  out.push(
    section(
      "Project Brief",
      `Problem: ${f.job || "(describe the problem and who it is for)"}\n${f.why ? `Why now: ${f.why}` : ""}${f.context ? `\nContext: ${f.context}` : ""}`,
    ),
  );
  out.push(
    section(
      "Requirements",
      `**Functional**\n${numbered("FR", jobReqs)}\n\n**Non-functional**\n${numbered("NFR", nfrs)}`,
    ),
  );
  out.push(
    section(
      "Epics & Stories",
      `**Epic 1 — Core build**\n- Story 1.1: ${jobReqs[0]}\n  - Given the brief above, when the work is delivered, then every functional requirement is met and the done-checks pass.\n  - Acceptance: ${doneChecks[0]}\n${jobReqs.length > 1 ? `- Story 1.2: ${jobReqs[1]}\n  - Given Story 1.1 is done, when this story is delivered, then it works without breaking Story 1.1.\n  - Acceptance: the done-checks still pass end to end.` : ""}`,
    ),
  );
  out.push(
    section(
      "MVP scope",
      `**In:** ${jobReqs.join("; ")}\n**Out:** anything not listed above — do not add features, pages, or integrations beyond this brief.`,
    ),
  );
  out.push(
    section(
      "Open questions",
      `List anything the brief does not answer, then ask before building — do not guess.`,
    ),
  );
  out.push(
    section(
      "Done-checks",
      doneChecks.map((d) => `- [ ] ${d}`).join("\n"),
    ),
  );
  if (f.deadline) out.push(`**Deadline:** ${f.deadline}`);
  return out.filter(Boolean).join("\n");
}

export function buildForged(mode: ForgeMode, f: ForgeFields): string {
  if (mode === "task") return buildTask(f);
  if (mode === "bmad") return buildBmad(f);
  return buildGeneral(f);
}

/** The seven real prompts from the Nov 27, 2026 audit, with audited scores. */
export interface ExamplePrompt {
  text: string;
  /** Audited score from the research note — do not recompute or invent. */
  score: number;
  label: string;
  why: string;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    text: "produce a chart for all four commodities and see when we started charting um when we started tracking them to their current value now.",
    score: 2,
    label: "Chart prompt",
    why: "Job is fuzzy on the start date, no why, no guardrails, no done-check. It only worked because the assistant already knew tracking started Oct 19.",
  },
  {
    text: "Use keys in different colors to build to distinguish which ones what?",
    score: 2,
    label: "Color keys",
    why: "A fragmented correction prompt. The assistant had to guess 'keys' meant the chart legend.",
  },
  {
    text: "Those who recreate this and try to brand it with um OTP and Carfish KSW",
    score: 2,
    label: "Brand it",
    why: "Voice garble ('Carfish' for Karfear) and no brand mark specified — KSW vs KSWBST — so the first version was wrong and needed a redo.",
  },
  {
    text: "can we run it against my income in the past same time?",
    score: 3,
    label: "Income check",
    why: "'Past same time' is ambiguous — the assistant inferred the 40-day window. No why, no done-check.",
  },
  {
    text: "If I invested what would be the best place of that cash instead of on daily living n shops n where did my income go",
    score: 3,
    label: "Invest instead",
    why: "Two different jobs fused into one run-on sentence, no timeframe, no definition of 'best'.",
  },
  {
    text: "https://youtu.be/81Jg17dQz1A?is=eDhFYYVwAXV9HbDA",
    score: 0,
    label: "Bare link",
    why: "A link with no text at all — no job, no why, no guardrails, no done. Works only on shared history.",
  },
  {
    text: "Post",
    score: 2,
    label: "One word",
    why: "Which account? Which posts? It failed on @karfearbst because that account isn't linked — a done-check would have caught it up front.",
  },
];

export const SIX_LESSONS: { title: string; line: string }[] = [
  {
    title: "1. Communicate clearly",
    line: "Brief like a manager: the whole job, the why, only the guardrails that matter, and what done looks like.",
  },
  {
    title: "2. Give better feedback",
    line: "A bad output is feedback on your prompt — rewind, fix the first prompt, rerun. Experts recover 4x as often; beginners quit 19% of the time.",
  },
  {
    title: "3. Make work faster to review",
    line: "You become the bottleneck — experts get 3,200 words back vs 600. Lead with what needs your attention and whether the goal was met.",
  },
  {
    title: "4. Automate what you never get to",
    line: "27% of Claude-assisted work wouldn't have happened at all. Keep a never-get-to list and review it weekly.",
  },
  {
    title: "5. Give Claude your decisions",
    line: "You make 70% of planning decisions, 20% of execution. The AI only knows what it can read — put decisions where it can see them.",
  },
  {
    title: "6. Keep your setup lean",
    line: "Standing instructions grew to 8,500 lines in a year. Audit skills, rules, and scheduled tasks every couple of weeks and cut what no longer fits.",
  },
];

export const MODE_LABELS: Record<ForgeMode, string> = {
  general: "General brief",
  task: "Task brief",
  bmad: "BMAD Build",
};
