import type { Thread, ChatMessage, AgentRun } from "@/lib/types";

export const THREADS: Thread[] = [
  {
    id: "t1",
    title: "Q4 launch war room",
    preview: "Oretha: 3 tasks assigned, PRs under review.",
    time: "10:11am",
    category: "Work",
    unread: 2,
    running: true,
    agentIds: ["oretha", "kevo"],
  },
  {
    id: "t2",
    title: "Cover art — “Midnight Ankh”",
    preview: "Muse: v3 ready. Gold foil variant attached.",
    time: "9:47am",
    category: "Media",
    unread: 1,
    agentIds: ["muse"],
  },
  {
    id: "t3",
    title: "124 Marcus Ave underwriting",
    preview: "Booker: comps look strong. Memo drafted.",
    time: "Yesterday",
    category: "Real Estate",
    agentIds: ["booker"],
  },
  {
    id: "t4",
    title: "Auth service refactor",
    preview: "Kevo: PR #482 open for your review.",
    time: "Yesterday",
    category: "Code",
    unread: 1,
    running: true,
    agentIds: ["kevo"],
  },
  {
    id: "t5",
    title: "Sunday reset",
    preview: "Oretha: Week 36 recap is ready whenever you are.",
    time: "Sun",
    category: "Personal",
    agentIds: ["oretha"],
  },
];

export const MESSAGES: Record<string, ChatMessage[]> = {
  t1: [
    {
      id: "m1",
      role: "user",
      text: "Come up with a launch plan for the Q4 drop. I want agents on everything.",
      time: "10:11 AM",
    },
    {
      id: "m2",
      role: "oretha",
      text: "On it. Kevo has the release branch, Muse is drafting the teaser pack, and I'm tracking the board. You'll get a full rundown by 2pm.",
      time: "10:11 AM",
      toolLabel: "Delegated to 3 agents",
    },
  ],
};

export const RUNS: AgentRun[] = [
  {
    id: "r1",
    agentId: "oretha",
    title: "Q4 launch war room",
    summary: "3 tasks assigned, PRs under review, teaser brief sent to Muse.",
    time: "10:11am",
    status: "running",
    steps: [
      {
        label: "Assign launch tasks",
        detail: "3 owners set on the KEVO board",
        status: "complete",
      },
      {
        label: "Review open PRs",
        detail: "2 of 3 reviewed via Kevo",
        status: "running",
      },
      {
        label: "Brief Muse on teaser",
        detail: "Waiting on hook approval",
        status: "running",
      },
    ],
  },
  {
    id: "r2",
    agentId: "kevo",
    title: "Auth service refactor",
    summary: "Refactored session handling; PR #482 awaiting review.",
    time: "9:52am",
    status: "running",
    steps: [
      {
        label: "Audit session code",
        detail: "4 hotspots found",
        status: "complete",
      },
      {
        label: "Open refactor PR",
        detail: "PR #482 opened",
        status: "complete",
      },
      {
        label: "Run CI suite",
        detail: "Tests 41/44 green",
        status: "running",
      },
    ],
  },
  {
    id: "r3",
    agentId: "steward",
    title: "Morning inbox triage",
    summary: "42 emails sorted, 3 tasks surfaced to the board.",
    time: "8:00am",
    status: "complete",
    steps: [
      { label: "Sweep inbox", detail: "42 emails processed", status: "complete" },
      {
        label: "Surface tasks",
        detail: "3 tasks created from email",
        status: "complete",
      },
    ],
  },
];
