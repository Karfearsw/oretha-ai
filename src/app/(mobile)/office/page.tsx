"use client";

import Link from "next/link";
import {
  Users,
  KanbanSquare,
  Activity,
  Inbox,
  GitPullRequest,
  CircleDot,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { EMPLOYEES, TASKS } from "@/lib/mock/office";
import { RUNS } from "@/lib/mock/threads";

const NAV_CARDS = [
  {
    href: "/office/directory",
    icon: Users,
    title: "AI Employee Directory",
    desc: "Who's on the floor and what they own",
    count: "6 on duty",
    tint: "text-violet",
  },
  {
    href: "/office/board",
    icon: KanbanSquare,
    title: "Task Board",
    desc: "Everything surfaces here — email, GitHub, Linear",
    count: "5 open · 1 overdue",
    tint: "text-gold",
  },
  {
    href: "/office/pulse",
    icon: Activity,
    title: "Company Pulse",
    desc: "Weekly metrics and agent commentary",
    count: "Updated 9:58am",
    tint: "text-complete",
  },
  {
    href: "/office/inbox",
    icon: Inbox,
    title: "Inbox & Automations",
    desc: "Agent mailroom — email becomes tasks, drafts, filings",
    count: "Live",
    tint: "text-[#38bdf8]",
  },
];

const ALERTS = [
  {
    icon: GitPullRequest,
    text: "Kevo opened PR #482 on auth refactor",
    time: "9:52am",
    tone: "violet" as const,
  },
  {
    icon: CircleDot,
    text: "Linear: 2 new issues in Launch cycle",
    time: "9:30am",
    tone: "gold" as const,
  },
  {
    icon: AlertTriangle,
    text: "Vendor SSL cert overdue — Sentry flagged",
    time: "8:05am",
    tone: "alert" as const,
  },
];

export default function OfficeHomePage() {
  const onDuty = EMPLOYEES.filter((e) => e.status !== "idle");

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-gold to-violet font-display text-[18px] font-bold text-canvas">
          K
        </span>
        <div>
          <h1 className="font-display text-[22px] font-bold text-cream">
            KEVO Office
          </h1>
          <p className="text-[12.5px] text-sand">
            AI-augmented virtual office for Karfear&apos;s Softwear.
          </p>
        </div>
      </header>

      <OfficeSubTabs />

      <section aria-label="Office sections" className="flex flex-col gap-2.5">
        {NAV_CARDS.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="flex items-center gap-3.5 rounded-[18px] border border-white/8 bg-elevated p-4 transition active:scale-[0.98]"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/6 ${c.tint}`}>
              <c.icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[15.5px] font-bold text-cream">
                {c.title}
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-sand">
                {c.desc}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] font-semibold text-clay">{c.count}</span>
              <ChevronRight size={16} className="text-clay" />
            </span>
          </Link>
        ))}
      </section>

      <section aria-label="Office alerts">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          Office Alerts
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {ALERTS.map((a, i) => (
            <div
              key={i}
              className={`w-[240px] shrink-0 rounded-[16px] border border-white/8 bg-elevated p-3.5 ${
                a.tone === "alert" ? "border-l-2 border-l-alert" : a.tone === "gold" ? "border-l-2 border-l-gold" : "border-l-2 border-l-violet"
              }`}
            >
              <div className="flex items-center gap-2">
                <a.icon size={15} className="text-sand" />
                <span className="text-[11px] text-clay">{a.time}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-cream">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="On duty">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-cream">On duty</h2>
          <Link href="/office/directory" className="text-[12.5px] font-medium text-gold">
            Full directory
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {onDuty.map((e) => (
            <div
              key={e.id}
              className="flex w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-[16px] border border-white/8 bg-elevated p-3"
            >
              <AgentAvatar agentId={e.id} name={e.name} size={44} status={e.status} />
              <span className="truncate text-[12px] font-semibold text-cream">
                {e.name}
              </span>
              <Chip tone={e.status === "working" ? "gold" : "complete"}>
                {e.status === "working" ? "Working" : "Online"}
              </Chip>
            </div>
          ))}
        </div>
      </section>

      <p className="pb-2 text-center text-[11.5px] text-clay">
        {RUNS.filter((r) => r.status === "running").length} workflows running ·
        next sweep at noon
      </p>
    </main>
  );
}
