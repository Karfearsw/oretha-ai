"use client";

/* Office → Activity: every delegated task with its plan, receipts, and
 * controls (approve / pause / resume / cancel / retry). This is the
 * OpenMuse "Activity" idea — durable plans you can steer. */

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Loader2, Inbox } from "lucide-react";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { AgentTaskCard, type PlanStepView } from "@/components/chats/AgentTaskCard";

interface TaskRow {
  id: string;
  title: string;
  goal: string;
  status: string;
  steps: PlanStepView[];
  summary: string;
  lastError: string | null;
  updatedAt: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/agent-tasks");
    if (res.ok) {
      const d = await res.json();
      setTasks(d.tasks ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh while anything is mid-run.
  useEffect(() => {
    if (!tasks.some((t) => t.status === "running")) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [tasks, load]);

  return (
    <main className="pad-safe-top flex flex-col px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">Activity</h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Delegated work with plans you approve, pause, and retry.
        </p>
      </header>

      <div className="mt-3">
        <OfficeSubTabs />
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-clay">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </p>
      ) : tasks.length === 0 ? (
        <section className="mt-6 flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-white/12 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gold/12 text-gold">
            <ListChecks size={22} />
          </span>
          <p className="font-display text-[16px] font-bold text-cream">
            Nothing delegated yet
          </p>
          <p className="max-w-[260px] text-[13px] leading-snug text-sand">
            Ask {`Oretha`} in chat to “delegate” something — she'll draft a plan,
            and it waits here for your approval.
          </p>
        </section>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {tasks.map((t) => (
            <div key={t.id} className="flex flex-col gap-1.5">
              <p className="flex items-center justify-between px-1 text-[11.5px] text-clay">
                <span className="truncate">{t.goal.slice(0, 80)}</span>
                <span className="shrink-0">{timeAgo(t.updatedAt)}</span>
              </p>
              <AgentTaskCard taskId={t.id} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 pb-4 text-center text-[11.5px] text-clay">
        <Inbox size={12} /> Interrupted runs are reclaimed automatically — nothing
        is lost if the server restarts
      </p>
    </main>
  );
}
