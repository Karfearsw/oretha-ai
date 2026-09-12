import type { Agent } from "@/lib/types";

export const AGENTS: Agent[] = [
  {
    id: "oretha",
    name: "Oretha",
    role: "Chief Orchestrator",
    description:
      "Runs the floor. Delegates to every agent, keeps the office moving, and talks to you straight.",
    domain: "Office",
    capabilities: [
      "Delegates work across all agents",
      "Answers with full company context",
      "Runs multi-step background tasks",
      "Summarizes threads and meetings",
    ],
    connectors: ["GitHub", "Linear", "Email", "Calendar"],
    examplePrompts: [
      "What needs my attention today?",
      "Draft the Q4 launch plan",
      "Catch me up on every open thread",
    ],
    status: "working",
    pinned: true,
  },
  {
    id: "kevo",
    name: "Kevo",
    role: "CTO · Engineering Lead",
    description:
      "Ships the Softwear. Reviews PRs, triages issues, and keeps the builds green.",
    domain: "Dev",
    capabilities: [
      "Code review and PR triage",
      "Issue writing and sprint planning",
      "Architecture sketches",
      "Incident runbooks",
    ],
    connectors: ["GitHub", "Linear"],
    examplePrompts: [
      "Review the auth PR",
      "Break down this ticket",
      "What broke overnight?",
    ],
    status: "working",
    pinned: true,
  },
  {
    id: "muse",
    name: "Muse",
    role: "Media Director",
    description:
      "Cover art, clips, hooks. Turns a rough idea into a full content sprint.",
    domain: "Media",
    capabilities: [
      "Image and video generation",
      "Hook and caption writing",
      "Thumbnail systems",
      "Social pack assembly",
    ],
    connectors: ["YouTube", "TikTok", "Instagram"],
    examplePrompts: [
      "Design cover art for 'Midnight Ankh'",
      "Cut a 30s teaser from this clip",
      "Write 10 hooks for this post",
    ],
    status: "online",
    pinned: true,
  },
  {
    id: "booker",
    name: "Booker",
    role: "Real Estate Analyst",
    description:
      "Comps, cash flow, and deal memos. Underwrites a property before you finish your coffee.",
    domain: "Real Estate",
    capabilities: [
      "Comp analysis and rent surveys",
      "Deal memo drafting",
      "Expense forecasting",
      "Market scans",
    ],
    connectors: ["Email", "Cloud Drive"],
    examplePrompts: [
      "Analyze 124 Marcus Ave",
      "Draft an LOI for the duplex",
      "Scan new multifamily listings",
    ],
    status: "idle",
  },
  {
    id: "sentry",
    name: "Sentry",
    role: "Security Recon",
    description:
      "Quietly watches the perimeter. Flags recon hits, leaked creds, and exposure drift.",
    domain: "Security",
    capabilities: [
      "Attack-surface scans",
      "Credential leak monitoring",
      "Vendor risk notes",
      "Hardening checklists",
    ],
    connectors: ["GitHub", "Email"],
    examplePrompts: [
      "Scan the perimeter",
      "Any new exposures this week?",
      "Draft a hardening checklist",
    ],
    status: "online",
  },
  {
    id: "steward",
    name: "Steward",
    role: "Office Manager",
    description:
      "Keeps the KEVO floor clean: inbox triage, task intake, and follow-ups that don't slip.",
    domain: "Office",
    capabilities: [
      "Inbox zero automation",
      "Task intake from email",
      "Meeting prep docs",
      "Follow-up reminders",
    ],
    connectors: ["Email", "Calendar", "Linear"],
    examplePrompts: [
      "Triage today's inbox",
      "Prep me for the 2pm",
      "Chase the outstanding invoice",
    ],
    status: "idle",
  },
];

export const agentById = (id: string): Agent | undefined =>
  AGENTS.find((a) => a.id === id);
