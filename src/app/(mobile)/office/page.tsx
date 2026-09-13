"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  KanbanSquare,
  Activity,
  Inbox,
  GitPullRequest,
  CircleDot,
  AlertTriangle,
  Mail,
  ChevronRight,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { EMPLOYEES } from "@/lib/mock/office";

interface Alert {
  icon: typeof Mail;
  text: string;
  time: string;
  href: string;
  tone: "violet" | "gold" | "alert";
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OfficeHomePage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({
    workflows: 0,
    running: 0,
    tasks: 0,
    untriaged: 0,
    lastSweep: null as string | null,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      const alerts: Alert[] = [];

      // Real signal: workflow runs (failures + recency)
      try {
        const r = await fetch("/api/runs/recent");
        if (r.ok) {
          const d = await r.json();
          for (const run of (d.runs ?? []).slice(0, 3)) {
            alerts.push({
              icon:
                run.status === "failed"
                  ? AlertTriangle
                  : run.action === "mail_triage"
                    ? Inbox
                    : CircleDot,
              text:
                run.status === "failed"
                  ? `Workflow "${run.workflow}" failed — check it`
                  : run.summary
                    ? `${run.workflow}: ${run.summary.slice(0, 70)}`
                    : `${run.workflow} ${run.status === "running" ? "is running" : "finished"}`,
              time: timeAgo(run.at),
              href: "/workflows",
              tone: run.status === "failed" ? "alert" : run.status === "running" ? "gold" : "violet",
            });
          }
          if (alive) {
            setStats((s) => ({
              ...s,
              running: (d.runs ?? []).filter((x: { status: string }) => x.status === "running").length,
              lastSweep: d.runs?.[0]?.at ?? null,
            }));
          }
        }
      } catch {}

      // Real signal: board size + untriaged mail
      try {
        const [t, m] = await Promise.all([fetch("/api/tasks"), fetch("/api/mail/sync")]);
        if (t.ok) {
          const d = await t.json();
          if (alive) setStats((s) => ({ ...s, tasks: (d.tasks ?? []).length }));
        }
        if (m.ok) {
          const d = await m.json();
          const untriaged = (d.mailboxes ?? []).reduce(
            (n: number, mb: { emails: { triaged: boolean }[] }) =>
              n + mb.emails.filter((e) => !e.triaged).length,
            0,
          );
          if (alive) setStats((s) => ({ ...s, untriaged }));
          if (untriaged > 0)
            alerts.push({
              icon: Inbox,
              text: `${untriaged} email${untriaged === 1 ? "" : "s"} waiting for triage`,
              time: "now",
              href: "/office/inbox",
              tone: "gold",
            });
        }
      } catch {}

      if (alive) setAlerts(alerts.slice(0, 4));
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Workflows count for the tile
  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.workflows && setStats((s) => ({ ...s, workflows: d.workflows.length })))
      .catch(() => {});
  }, []);

  const onDuty = EMPLOYEES.filter((e) => e.status !== "idle");

  const NAV_CARDS = [
    {
      href: "/office/directory",
      icon: Users,
      title: "AI Employee Directory",
      desc: "Who's on the floor and what they own",
      count: `${EMPLOYEES.length} on duty`,
      tint: "text-violet",
    },
    {
      href: "/office/board",
      icon: KanbanSquare,
      title: "Task Board",
      desc: "Everything surfaces here — email, workflows",
      count: `${stats.tasks} open`,
      tint: "text-gold",
    },
    {
      href: "/workflows",
      icon: WorkflowIcon,
      title: "Workflows",
      desc: "Scheduled automations with real run history",
      count: stats.workflows > 0 ? `${stats.workflows} active` : "Set up",
      tint: "text-complete",
    },
    {
      href: "/office/inbox",
      icon: Inbox,
      title: "Inbox & Automations",
      desc: "Agent mailroom — email becomes tasks",
      count: stats.untriaged > 0 ? `${stats.untriaged} new` : "Clear",
      tint: "text-[#38bdf8]",
    },
  ];

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
        {alerts.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-white/10 p-5 text-center text-[12.5px] text-clay">
            All clear. Runs, mail, and the board will report in here.
          </p>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {alerts.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className={`w-[240px] shrink-0 rounded-[16px] border border-white/8 bg-elevated p-3.5 border-l-2 ${
                  a.tone === "alert" ? "border-l-alert" : a.tone === "gold" ? "border-l-gold" : "border-l-violet"
                }`}
              >
                <div className="flex items-center gap-2">
                  <a.icon size={15} className="text-sand" />
                  <span className="text-[11px] text-clay">{a.time}</span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-cream">{a.text}</p>
              </Link>
            ))}
          </div>
        )}
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
        {stats.running > 0
          ? `${stats.running} workflow${stats.running === 1 ? "" : "s"} running right now`
          : stats.lastSweep
            ? `Last activity ${timeAgo(stats.lastSweep)}`
            : "The floor is quiet — schedule a workflow"}
      </p>
    </main>
  );
}
