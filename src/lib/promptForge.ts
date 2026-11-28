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

/**
 * Lesson 7 — how the #1 AI engineer actually uses AI.
 *
 * Andrej Karpathy (co-founded OpenAI, ran AI at Tesla, coined "vibe
 * coding", now at Anthropic), as reported by Nick Saraev in "How The #1 AI
 * Engineer in The World Actually Uses AI" (Nov 5, 2026), from Karpathy's
 * blog, X, and Hacker News posts. The six Anthropic lessons above are
 * untouched; this is the seventh lesson, in the same format.
 */
export interface KarpathyPrinciple {
  title: string;
  line: string;
}

export const KARPATHY_LESSON: {
  title: string;
  intro: string;
  principles: KarpathyPrinciple[];
  sources: string;
} = {
  title: "7. How the #1 AI engineer actually uses AI",
  intro:
    "Andrej Karpathy — co-founded OpenAI, ran AI at Tesla, coined “vibe coding”, now at Anthropic — as reported by Nick Saraev (Nov 5, 2026) from Karpathy's blog, X, and Hacker News posts.",
  principles: [
    {
      title: "Don't do the engineering",
      line: "Talk to the model; it does the work. You decide what gets done and check how it turned out. Reviewing a result is much cheaper than producing it.",
    },
    {
      title: "Short prompts, plain English",
      line: "Explain in ASD — aircraft-manual English: few words, strict vocabulary. Adding requirements often makes output worse, because our requests quietly contradict each other.",
    },
    {
      title: "Pictures beat explanations",
      line: "If you don't understand something, ask for a diagram, an HTML page, or an explainer video — a picture is worth a thousand words and faster to digest than a thousand words.",
    },
    {
      title: "Don't trust public benchmarks",
      line: "Most are flawed. Judge a model by how it interacts and communicates — Karpathy points to Epoch's ECI, a benchmark of benchmarks.",
    },
    {
      title: "Run small probe tests",
      line: "Ask “land or water?” for coordinates and build a world map from the answers — a quick probe shows what knowledge is actually compressed in the model's neurons.",
    },
    {
      title: "Cheap filters, then delegate down",
      line: "Let the strong model build filters (strip URLs, reposts, spam), then hand the clean remainder to cheaper sub-agents — Opus on medium delegating to Sonnet sub-agents. And build a fix the moment something annoys you: he saw clickbait thumbnails and built HackerTube.",
    },
    {
      title: "Share the data + the prompt, not the app",
      line: "Most apps are wrappers around data. Share the data source and the prompt and anyone can build their own version with a model.",
    },
  ],
  sources:
    "Video: Nick Saraev, “How The #1 AI Engineer in The World Actually Uses AI” (Nov 5, 2026) — youtube.com/watch?v=3wCkFtIz88g. Anthropic research: “How Claude Code is used in practice” and “How employment is changing at Anthropic” (anthropic.com/research).",
};

/**
 * Lesson 8 — don't build agents, build skills.
 *
 * Jay E / RoboNuggets, "Anthropic's Engineers Stopped Building AI Agents
 * (Here's What They Build Instead)" (Nov 23, 2026), from Anthropic
 * engineers Barry Zhang and Mahesh Murag's talk "Don't Build Agents, Build
 * Skills Instead". Model = chip, agent = OS, skills = apps.
 */
export interface SkillLevel {
  level: string;
  title: string;
  line: string;
}

export const SKILLS_LESSON: {
  title: string;
  intro: string;
  analogy: string;
  levels: SkillLevel[];
  rules: string[];
  sources: string;
} = {
  title: "8. Don't build agents, build skills",
  intro:
    "Jay E / RoboNuggets, “Anthropic's Engineers Stopped Building AI Agents (Here's What They Build Instead)” (Nov 23, 2026), from Anthropic engineers Barry Zhang and Mahesh Murag's talk “Don't Build Agents, Build Skills Instead”.",
  analogy:
    "The model is the chip. The agent is the operating system. Skills are the apps — when your computer needs to do something new, you install an app, not a new computer. One good agent plus a growing library of skills beats ten half-trained agents.",
  levels: [
    {
      level: "Level 0",
      title: "Write it by hand",
      line: "A skill is a folder with a SKILL.md: a name, a description, then plain-English steps — plus templates, examples, and scripts where they help.",
    },
    {
      level: "Level 1",
      title: "Skill creator",
      line: "Ask Claude to build the skill for you — describe the job and let it draft the SKILL.md.",
    },
    {
      level: "Level 2",
      title: "Do it once, then “skillify” it — the recommended one",
      line: "Do the task with the AI, correct it like a new hire, then turn the finished session into a skill. The corrections are the skill.",
    },
    {
      level: "Level 3",
      title: "Record your screen",
      line: "Record yourself doing the workflow once and let Claude learn the steps from the recording.",
    },
    {
      level: "Level 4",
      title: "Skills that aren't steps",
      line: "Not every skill is a procedure: database skills (how to read your data), artifact / brand skills (how things should look and sound), definition skills (what your terms mean), and one-liners.",
    },
    {
      level: "Level 5",
      title: "Borrow skills",
      line: "Take skills from skills.sh and the Claude directory instead of writing every one yourself. Security warning: read a skill before installing it — it can contain scripts.",
    },
    {
      level: "Level 6",
      title: "Sometimes no skills at all",
      line: "Boris Cherny's rule: test removing instruction files every 6 months. Old instructions can hobble a newer model. (The 80% system-prompt-cut figure in the video is unverified — treat it as a claim, not a fact.)",
    },
  ],
  rules: [
    "Fix the skill, not the chat — when something goes wrong, change one line in the skill so every future run is fixed.",
    "Let Claude interview you — it asks how you do the work, and the answers become the skill.",
    "Define what done means in the skill, so the agent grades its own output before it reaches you.",
    "Progressive disclosure: the toolbox stays closed until needed — the agent reads only names and descriptions, then opens the one skill that fits.",
  ],
  sources:
    "Video: Jay E / RoboNuggets, “Anthropic's Engineers Stopped Building AI Agents (Here's What They Build Instead)” (Nov 23, 2026). Talk: Barry Zhang and Mahesh Murag, “Don't Build Agents, Build Skills Instead” (Anthropic).",
};

/**
 * Lesson 9 — one personal agent beats ten tools.
 *
 * Sandeep Swadia, "This ONE AI Agent Will Make You So Productive It's
 * Almost Unfair" (Nov 4, 2026). The demos use ChatGPT's DOTS personal
 * agent, but the principles apply to Claude, Gemini, Meta Muse, and Grok.
 * One AI tool that knows you well beats ten that don't.
 */
export interface ProductivityForce {
  title: string;
  line: string;
}

export const PERSONAL_AGENT_LESSON: {
  title: string;
  intro: string;
  act: { letter: string; title: string; line: string }[];
  rule: string;
  forces: ProductivityForce[];
  sources: string;
} = {
  title: "9. One personal agent beats ten tools",
  intro:
    "Sandeep Swadia, “This ONE AI Agent Will Make You So Productive It's Almost Unfair” (Nov 4, 2026). Demos use ChatGPT's DOTS personal agent — the principles apply to Claude, Gemini, Meta Muse, and Grok. One AI tool that knows you well beats ten that don't: hiring a crowd of AI interns makes YOU their chief of staff.",
  act: [
    {
      letter: "A",
      title: "Autonomous",
      line: "Give it a goal and it figures out how — it runs in the cloud, works with your other tools and apps, and can take actions on your behalf.",
    },
    {
      letter: "C",
      title: "Continuous",
      line: "It keeps working after you close the tab, the chat, or the laptop — it orchestrates tasks for hours and comes back when done.",
    },
    {
      letter: "T",
      title: "Tailored",
      line: "It remembers your goals, your preferences, and how you like things done — that memory is what makes one agent beat ten tools.",
    },
  ],
  rule: "Let it manage, execute, and partner — but YOU make the final call. Otherwise it might post your bank statement on your Instagram story.",
  forces: [
    {
      title: "1. Fragments",
      line: "A 2022 Harvard Business Review study found Fortune 500 employees switched apps ~1,200 times a day, ~2 seconds each, ~40 minutes a day — and it damages attention, because you hunt for information before doing the work. The agent is the glue across your information islands: for interview prep it gathers your resume, notes, recruiter emails, and company research, then simulates the interview, challenges your weak answers, critiques, and repeats. McKinsey is testing AI agents that play clients in interviews.",
    },
    {
      title: "2. Flood",
      line: "A Microsoft 2025 survey of ~31,000 people found 117 emails and 153 Teams messages a day. The agent is a gatekeeper: check at 10am, 1pm, and 4pm, flag only the decisions waiting for you and the deadlines that changed, and give you a 5pm summary of the rest. It also simplifies dense material — lease clauses that could cost you money, and insurance terms most people can't define (a Carnegie Mellon study: only 14% of Americans with private insurance correctly defined four basic insurance terms). The risk: whoever filters decides what you see — check the work and keep refining it.",
    },
    {
      title: "3. Frequency",
      line: "Infrequent recurring tasks never become habits, so they fall through the cracks — his example is an iPhone trade-in with a 14-day return deadline, or a pulmonologist / sleep specialist every 3–4 months. The agent is the external trigger: it tracks the due dates and prompts you at the right time. Start with ONE irregular task.",
    },
    {
      title: "4. Future",
      line: "The first three steal hours; this one steals years. Randy Pausch's Last Lecture: people budget money carefully but rarely plan time. Write down three things you keep putting off, have the agent review your calendar every Sunday against your top three life priorities, report what you did toward them, and suggest changes for the coming week.",
    },
  ],
  sources:
    "Video: Sandeep Swadia, “This ONE AI Agent Will Make You So Productive It's Almost Unfair” (Nov 4, 2026) — youtube.com/watch?v=x9hrptrGGY0. Studies cited in the video: Harvard Business Review (2022, app-switching), Microsoft Work Trend Index (2025, ~31,000 surveyed), Carnegie Mellon (insurance literacy).",
};

/**
 * The 7 departments of the AI Agent Map (Nov 20, 2026) — 137 agent jobs in
 * total, each one job, one workflow, one approval gate. The full registry
 * lives in the Oretha FDE RDP v0.4, inside the KEVO Virtual Office, with
 * Oretha as the one orchestrator agent talking to the department sub-agents.
 * Each department here loads one real job-brief starter into the builder —
 * a forged brief (Job / Why / Guardrails / Done), not placeholder text.
 */
export interface DepartmentStarter {
  id: string;
  name: string;
  /** Agent jobs in this department on the map. */
  jobs: number;
  tagline: string;
  starter: ForgeFields;
  /**
   * The same job as a SKILL.md. The merge: the 137 jobs become skills for
   * the one Oretha agent, grouped into 7 department folders — not 137
   * separate agents. The description is the trigger, written for the agent.
   */
  skill: {
    name: string;
    description: string;
    steps: string[];
  };
}

/** Render one department's starter job as a SKILL.md file. */
export function buildSkillMarkdown(dept: DepartmentStarter): string {
  const lines = [
    "---",
    `name: ${dept.skill.name}`,
    `description: ${dept.skill.description}`,
    "---",
    "",
    `# ${dept.name} — ${dept.skill.name}`,
    "",
    "## When to use this skill",
    dept.skill.description,
    "",
    "## Steps",
    ...dept.skill.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Done means",
    dept.starter.done,
    "",
    "## Guardrails",
    dept.starter.guardrails,
  ];
  return lines.join("\n");
}

export const DEPARTMENTS: DepartmentStarter[] = [
  {
    id: "sales",
    name: "Sales",
    jobs: 22,
    tagline: "Finding leads, reading replies, booking calls.",
    starter: {
      role: "my Sales agent",
      job: "Score today's new leads and draft a follow-up for each one that is warm. Read every reply, score it hot, warm, or cold, and draft the next message in my voice for the warm ones only.",
      why: "So no warm lead goes cold while I am doing other work, and I only spend my time on people who already replied.",
      guardrails:
        "Draft only — never send anything, never call anyone. Do not invent a name, price, or promise. If a reply is unclear, mark it unclear instead of guessing.",
      done: "A scored list of every lead with hot / warm / cold, a draft follow-up for each warm lead, and nothing sent. I approve every send.",
    },
    skill: {
      name: "lead-scoring",
      description:
        "Use when new leads arrive or replies come in: score each lead hot, warm, or cold and draft the next message for the warm ones.",
      steps: [
        "Read every new lead and every reply in full before scoring anything.",
        "Score each one hot, warm, or cold — hot replied with interest, warm replied at all, cold no reply yet.",
        "For each warm lead, draft the next message in my voice, naming what they actually said back.",
        "Draft only. Never send anything and never call anyone.",
        "If a reply is unclear, mark it unclear instead of guessing what it means.",
        "Hand back the scored list with a draft follow-up for each warm lead.",
      ],
    },
  },
  {
    id: "deals",
    name: "Deals",
    jobs: 24,
    tagline: "Comps, cash flow, deal memos.",
    starter: {
      role: "my Deals agent (Booker)",
      job: "Refresh the comps on one property and write a one-page deal memo: ARV from the three closest comparable sales, estimated repairs, cash flow at the asking price, and the highest offer that still leaves a margin.",
      why: "So I can make an offer the same day I see a deal, with numbers I can defend instead of a guess.",
      guardrails:
        "Use real comparable sales only — never invent a comp, an ARV, or a repair cost. If a number is missing, write “unknown” and say what would confirm it. Do not contact the seller.",
      done: "A one-page memo with three real comps cited, ARV, repair estimate, cash flow, and a max offer — every number traceable to its source.",
    },
    skill: {
      name: "deal-memo",
      description:
        "Use when a property needs a yes/no: refresh the comps and write a one-page deal memo with ARV, repairs, cash flow, and a max offer.",
      steps: [
        "Pull the three closest comparable sales — same area, same bed/bath range, sold in the last six months.",
        "Set the ARV from those three comps and cite each one.",
        "Estimate repairs line by line; if a cost is unknown, write “unknown” and say what would confirm it.",
        "Work out the cash flow at the asking price, then the highest offer that still leaves a margin.",
        "Write the one-page memo: comps, ARV, repairs, cash flow, max offer.",
        "Do not contact the seller. Do not invent a comp, an ARV, or a repair cost.",
      ],
    },
  },
  {
    id: "marketing",
    name: "Marketing",
    jobs: 23,
    tagline: "Content, media, scheduled posts.",
    starter: {
      role: "my Marketing agent (Muse)",
      job: "Draft today's post for @whoisotp from the facts I give you: one hook, one story, one call to action, in my voice. Keep it short enough to read in ten seconds.",
      why: "So I post every day without spending an hour staring at a blank caption.",
      guardrails:
        "Use only facts I provided — never invent a price, a result, or a quote. Keep the trolling on @stackk10m, never on @whoisotp. Draft only — I approve the exact post before anything goes out.",
      done: "One finished caption with hook, story, and call to action, plus three hashtag options. Nothing posted.",
    },
    skill: {
      name: "post-draft",
      description:
        "Use when a post is due: draft one finished caption from facts I provide — hook, story, call to action — in my voice.",
      steps: [
        "Take only the facts I provided. Never invent a price, a result, or a quote.",
        "Write one hook that stops the scroll in the first line.",
        "Tell the story in my voice, short enough to read in ten seconds.",
        "End with one call to action — one thing, not three.",
        "Add three hashtag options.",
        "Draft only. Keep the trolling on @stackk10m, never on @whoisotp. I approve the exact post before anything goes out.",
      ],
    },
  },
  {
    id: "operations",
    name: "Operations",
    jobs: 19,
    tagline: "Onboarding, status updates, task board.",
    starter: {
      role: "my Operations agent (Steward)",
      job: "Build the new-client onboarding checklist for a client who just signed: the five setup steps in order, who does each one, and what “done” looks like for each step. Then draft the client a status update in plain language.",
      why: "So a new client is fully set up on day one instead of waiting a week while steps get forgotten.",
      guardrails:
        "Draft the status update only — do not send it. Never share another client's details. If a step needs information we do not have, list it as a question for me instead of guessing.",
      done: "A checklist with five steps, an owner per step, a done-check per step, and a drafted status update waiting for my yes.",
    },
    skill: {
      name: "client-onboarding",
      description:
        "Use when a client just signed: build the onboarding checklist and draft their day-one status update.",
      steps: [
        "List the five setup steps in order, from first contact to fully set up.",
        "Give each step an owner and a done-check that proves it is finished.",
        "If a step needs information we do not have, list it as a question for me instead of guessing.",
        "Draft the client a status update in plain language — what is done, what is next, and when.",
        "Draft only. Never share another client's details. The update waits for my yes.",
      ],
    },
  },
  {
    id: "customer",
    name: "Customer",
    jobs: 14,
    tagline: "Support chat and triage.",
    starter: {
      role: "my Customer agent",
      job: "Triage today's support messages: answer the ones our help pages already cover, using only the wording in those pages, and escalate anything about money, refunds, or a complaint to me with a one-line summary.",
      why: "So simple questions get answered in minutes and I only touch the ones that actually need a human.",
      guardrails:
        "Answer only from our own help pages — never invent a policy, a price, or a promise. Never issue a refund or change an order. If you are not sure, escalate instead of answering.",
      done: "Every message answered from a cited help page or escalated with a summary. Zero refunds or order changes made by the agent.",
    },
    skill: {
      name: "support-triage",
      description:
        "Use when support messages arrive: answer from our help pages or escalate money, refunds, and complaints to me with a one-line summary.",
      steps: [
        "Read each message and find the matching help page, if one exists.",
        "Answer only with the wording on that page, and cite the page.",
        "Escalate anything about money, refunds, or a complaint — with a one-line summary — instead of answering.",
        "If no help page covers it, or you are not sure, escalate instead of answering.",
        "Never issue a refund or change an order. Never invent a policy, a price, or a promise.",
      ],
    },
  },
  {
    id: "back-office",
    name: "Back Office",
    jobs: 18,
    tagline: "Invoices, payment chasing, books.",
    starter: {
      role: "my Back Office agent (Mailroom)",
      job: "Run the payment chaser on the overdue invoice list: Day 1 polite nudge, Day 7 firmer email with the invoice attached, Day 14 alert to me with the full history. Stop the moment a payment is marked received.",
      why: "So invoices get paid without me chasing people, and nobody gets chased after they already paid.",
      guardrails:
        "Use the contract's own payment terms when answering questions. Never threaten, never add a fee that is not in the contract. Draft the Day 7 and Day 14 messages for my approval — send nothing without my yes.",
      done: "Every overdue invoice has the right step sent or drafted, paid invoices are marked paid with a thank-you sent, and nothing was chased after payment.",
    },
    skill: {
      name: "payment-chaser",
      description:
        "Use on the overdue invoice list: run the Day 1 / Day 7 / Day 14 chase and stop the moment a payment is marked received.",
      steps: [
        "Check the overdue list and confirm which invoices are still unpaid.",
        "Day 1: send a polite nudge with the invoice attached.",
        "Day 7: send a firmer email with the invoice attached — draft it for my approval first.",
        "Day 14: alert me with the full history — draft it for my approval first.",
        "Answer terms questions only from the contract's own payment terms.",
        "The moment a payment is marked received: stop the chase, mark the invoice paid, send a thank-you.",
        "Never threaten, never add a fee that is not in the contract.",
      ],
    },
  },
  {
    id: "intelligence",
    name: "Intelligence",
    jobs: 17,
    tagline: "The 7am brief and the yes/no panel.",
    starter: {
      role: "my Intelligence agent",
      job: "Write today's 7am brief on one page: what closed, what stalled, what needs me — plus a “Needs your yes” panel holding every item that touches a client or money, each with one line of context and the exact action waiting on me.",
      why: "So I start the day knowing the whole business in one minute instead of digging through six apps.",
      guardrails:
        "Only use what the other departments recorded — never invent a closed deal, a payment, or a lead. If the numbers disagree between two sources, show both and flag it. Nothing in the brief sends, books, or pays anything.",
      done: "One page by 7am: closed, stalled, needs-me, and a yes/no panel with every client- or money-touching item and its waiting action.",
    },
    skill: {
      name: "morning-brief",
      description:
        "Use every morning: write the one-page 7am brief — what closed, what stalled, what needs the owner — plus the 'Needs your yes' panel.",
      steps: [
        "Gather what each department recorded since the last brief: closed, stalled, and waiting items.",
        "Write one page: what closed, what stalled, what needs me — in that order.",
        "Build the “Needs your yes” panel: every item that touches a client or money, one line of context each, and the exact action waiting on me.",
        "If two sources disagree on a number, show both and flag it — never pick one silently.",
        "Never invent a closed deal, a payment, or a lead. Only use what the departments recorded.",
        "Nothing in the brief sends, books, or pays anything.",
      ],
    },
  },
];
