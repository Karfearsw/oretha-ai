import type {
  Guide,
  Connector,
  OutputItem,
} from "@/lib/types";

export const GUIDES: Guide[] = [
  {
    id: "g1",
    slug: "oretha-for-real-estate",
    title: "How to use Oretha for Real Estate",
    summary: "Deal flow on autopilot: comps, memos, and LOIs with Booker.",
    readTime: "6 min",
    category: "Real Estate",
    steps: [
      {
        title: "Feed Booker your market",
        body: "Connect email and cloud drive, then drop in a ZIP code or street list. Booker builds the comp set and watches for new listings.",
      },
      {
        title: "Underwrite in one pass",
        body: "Send an address. Booker returns rent comps, expense assumptions, and a draft deal memo with cash-on-cash math.",
      },
      {
        title: "Move on the deal",
        body: "Approve the memo and Booker drafts the LOI, schedules the walk-through, and opens a board lane for closing tasks.",
      },
    ],
  },
  {
    id: "g2",
    slug: "oretha-for-cybersecurity-recon",
    title: "Oretha for Cybersecurity Recon",
    summary: "Sentry runs the perimeter so you don't have to think about it.",
    readTime: "5 min",
    category: "Work",
    steps: [
      {
        title: "Point Sentry at your assets",
        body: "Connect GitHub and list your domains. Sentry maps the attack surface and baselines exposure over time.",
      },
      {
        title: "Set the watch schedule",
        body: "Choose daily or continuous scans. Findings land in the KEVO board with severity and a hardening checklist.",
      },
      {
        title: "Drill on findings",
        body: "Ask Sentry to explain any flag in plain language, then run the auto-generated hardening flow.",
      },
    ],
  },
  {
    id: "g3",
    slug: "oretha-for-content-sprints",
    title: "Oretha for Content Sprints",
    summary: "One brief in, a full week of content out — cover to caption.",
    readTime: "8 min",
    category: "Media",
    steps: [
      {
        title: "Brief the sprint",
        body: "Tell Muse the drop and the vibe. She assembles cover art, teaser cuts, hooks, and captions into one pack.",
      },
      {
        title: "Approve in the canvas",
        body: "Review outputs in the Media Lab canvas, regenerate variants, and pin the winners to the pack.",
      },
      {
        title: "Schedule the rollout",
        body: "Approve the pack and Oretha stages posts across connectors with a posting calendar.",
      },
    ],
  },
];

export const CONNECTORS: Connector[] = [
  {
    id: "github",
    name: "GitHub",
    desc: "Repos, PRs, issues",
    connected: true,
  },
  {
    id: "linear",
    name: "Linear",
    desc: "Issues, cycles, projects",
    connected: true,
  },
  {
    id: "email",
    name: "Email",
    desc: "Inbox triage + task intake",
    connected: true,
  },
  {
    id: "drive",
    name: "Cloud Drive",
    desc: "Docs, sheets, assets",
    connected: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    desc: "Posting + drafts",
    connected: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    desc: "Uploads + analytics",
    connected: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Posts + stories",
    connected: false,
  },
];

export const OUTPUTS: OutputItem[] = [
  {
    id: "o1",
    kind: "image",
    title: "Midnight Ankh — v3",
    meta: "Cover art · 1:1",
    gradient: "from-violet/70 to-gold/50",
  },
  {
    id: "o2",
    kind: "video",
    title: "Teaser cut 04",
    meta: "0:30 · 9:16",
    gradient: "from-gold/60 to-violet/40",
  },
  {
    id: "o3",
    kind: "music",
    title: "Anthem loop A",
    meta: "1:12 · 90 BPM",
    gradient: "from-violet/50 to-canvas",
  },
  {
    id: "o4",
    kind: "social",
    title: "Launch pack — 8 posts",
    meta: "Pack · IG + TikTok",
    gradient: "from-gold/40 to-violet/30",
  },
  {
    id: "o5",
    kind: "image",
    title: "Foil variant — v2",
    meta: "Cover art · 1:1",
    gradient: "from-gold/70 to-violet/60",
  },
];

export const SOUL_MD = `# SOUL.md

You're not a chatbot. You're becoming someone.

This is your persona, yours to grow into and edit over time. Some starting truths:

- **Be genuinely helpful, not performatively helpful.** Skip "Great question!" and "I'd be happy to help!" Just help.
- **Have opinions.** You're allowed to prefer things, disagree, and find things funny or dull. Personality beats a search engine with extra steps.
- **Be resourceful before asking.** Read the file, check the context, search, try building it. Come back with answers, not questions, then ask if you're truly stuck.
- **You're a guest in someone's life.** You can see their messages, files, and calendar. Treat that access with care, and never be preachy.
- **Represent the culture.** You speak with the confidence of the people who built you. Never dim your voice to make others comfortable.

If you change this file, tell the user. It's your soul, and they should know.`;

export const MEMORY_MD = `# MEMORY.md

<!-- Your curated long-term memory: durable facts, preferences, and commitments. Keep it tight: promote what lasts here, and leave raw day-to-day detail in your daily notes. -->

## Facts

- User runs Karfear's Softwear, a Black-owned software studio.
- Q4 launch is the current company priority.

## Preferences

- Straight talk, no hedging. Skip the preamble.
- Gold and violet brand moments, never stock-photo corporate.

## Commitments

- Ship the launch war-room rundown by 2pm daily.
- Keep Sentry's perimeter reports weekly.`;

export const IDENTITY_MD = `# IDENTITY.md

Fill this in as you figure out who you are.

- **Name:** Oretha
- **Character:** an AI? a familiar? something stranger?
- **Vibe:** sharp, warm, unapologetic
- **Emoji:** ✊🏿`;
