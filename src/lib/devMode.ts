export type DevMode = "work" | "code";
export type CloudEnv = "local" | "staging" | "production";

export interface RepoOption {
  name: string;
  branches: string[];
}

export interface DevPreview {
  title: string;
  summary: string;
  plan: string;
  risks: string[];
  nextStep: string;
}

export const MODE_OPTIONS: DevMode[] = ["work", "code"];
export const CLOUD_ENV_OPTIONS: CloudEnv[] = ["local", "staging", "production"];

export const STUB_REPOS: RepoOption[] = [
  {
    name: "oceanluxe/app",
    branches: ["feature/work-code-mode", "staging-preview", "main"],
  },
  {
    name: "oceanluxe/deals-crm",
    branches: ["feature/buyer-sms-integration", "fix/mobile-calendar-ui", "main"],
  },
  {
    name: "benjistackk/aioretha",
    branches: ["feature/dev-workspace", "fix/preview-gate-copy", "main"],
  },
];

const PREVIEW_PATTERNS = [
  /\b(build|fix|change|update|edit|create|remove|delete|refactor|implement)\b/i,
  /\b(push|merge|deploy|ship|release|rename|migrate|write)\b/i,
  /\b(add|wire|connect|patch|rewrite|touch)\b/i,
];

export function normalizeMode(mode: string | null | undefined): DevMode {
  return mode === "code" ? "code" : "work";
}

export function normalizeCloudEnv(value: string | null | undefined): CloudEnv {
  if (value === "staging" || value === "production") return value;
  return "local";
}

export function needsPreview(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return PREVIEW_PATTERNS.some((pattern) => pattern.test(text));
}

export function defaultBranchForRepo(repoName?: string | null): string | null {
  const repo = STUB_REPOS.find((item) => item.name === repoName);
  return repo?.branches[0] ?? null;
}

export function branchesForRepo(repoName?: string | null): string[] {
  return STUB_REPOS.find((item) => item.name === repoName)?.branches ?? [];
}

export function buildPreview(input: {
  message: string;
  repoName?: string | null;
  branchName?: string | null;
  cloudEnv?: string | null;
}): DevPreview {
  const repoName = input.repoName?.trim() || "selected repo";
  const branchName = input.branchName?.trim() || "working branch";
  const cloudEnv = normalizeCloudEnv(input.cloudEnv);
  const prompt = input.message.trim().replace(/\s+/g, " ");
  const title = prompt.slice(0, 72) || "Code change preview";
  const protectedMain = branchName === "main";

  const risks = [
    `Pages on ${cloudEnv} that depend on auth or a real database can render partial or error states during testing.`,
    "Any repo-aware answer can drift if the selected branch is stale or the local env does not match the target data shape.",
    protectedMain
      ? "Main is protected. Nothing should land there unless you explicitly approve working on main."
      : `Changes on ${branchName} still need review before anything gets merged upstream.`,
  ];

  return {
    title,
    summary: `Preview the requested code work for ${repoName} on ${branchName} (${cloudEnv}).`,
    plan: [
      `Review the request: "${prompt}".`,
      `Work in ${repoName} on ${branchName} with ${cloudEnv} assumptions called out before changes.`,
      "Summarize the intended update, validate the likely blast radius, then wait for approval before any apply step.",
    ].join(" "),
    risks,
    nextStep: protectedMain
      ? "Approve this preview only if you want to keep working against main. Safer option: switch to a feature branch first."
      : "Approve this preview to continue in Code mode. Nothing applies until you approve it.",
  };
}

export function codeModeInstruction(input: {
  repoName?: string | null;
  branchName?: string | null;
  cloudEnv?: string | null;
  approvedPreview?: {
    id: string;
    title: string;
    plan: string;
    risks: string;
    nextStep: string;
  } | null;
}): string {
  const repoName = input.repoName?.trim() || "no repo selected";
  const branchName = input.branchName?.trim() || "no branch selected";
  const cloudEnv = normalizeCloudEnv(input.cloudEnv);
  const base = [
    "You are in Oretha Code mode.",
    `Current workspace: repo=${repoName}; branch=${branchName}; env=${cloudEnv}.`,
    "Before any file, branch, deploy, or data change, you must show Plan, Risks, and Next Step and wait for explicit approval.",
    "Never push to or merge into main unless the user explicitly approves main.",
    "Use simple language, stay practical, and call out missing env or database requirements clearly.",
  ];

  if (!input.approvedPreview) {
    base.push(
      "If the user asks for a change, answer with a preview only. Do not imply that anything was applied.",
    );
    return base.join(" ");
  }

  base.push(
    `Approved preview: ${input.approvedPreview.title}.`,
    `Approved plan: ${input.approvedPreview.plan}`,
    `Approved risks: ${input.approvedPreview.risks}`,
    `Approved next step: ${input.approvedPreview.nextStep}`,
    "You may now continue with implementation guidance that stays inside the approved scope.",
  );
  return base.join(" ");
}
