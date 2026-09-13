"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Github,
  CircleDot,
  PenLine,
  Bot,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { agentById } from "@/lib/mock/agents";
import type { Task, TaskLane, TaskSource } from "@/lib/types";

const LANES: TaskLane[] = ["Inbox", "In Progress", "Waiting", "Done"];

const SOURCE_ICON: Record<TaskSource, typeof Mail> = {
  Email: Mail,
  GitHub: Github,
  Linear: CircleDot,
  Manual: PenLine,
};

const PRIORITY_TONE = {
  high: "alert",
  med: "gold",
  low: "neutral",
} as const;

export default function BoardPage() {
  const [selected, setSelected] = useState<Task | null>(null);
  const [apiTasks, setApiTasks] = useState<Task[]>([]);

  // Real board rows: email triage + chat-created tasks.
  useEffect(() => {
    let alive = true;
    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.tasks) return;
        setApiTasks(
          (d.tasks as Task[]).map((t) => ({
            ...t,
            source: t.source as TaskSource,
            lane: t.lane as TaskLane,
            due: t.due ?? "—",
            overdue: false,
          })),
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Real rows only — email triage + chat-created tasks, all from the DB.
  const allTasks: Task[] = apiTasks;

  return (
    <main className="pad-safe-top flex flex-col px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          Task Board
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Everything lands here. Agents work it, you approve it.
        </p>
      </header>

      <div className="mt-3">
        <OfficeSubTabs />
      </div>

      <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {LANES.map((lane) => {
          const laneTasks = allTasks.filter((t) => t.lane === lane);
          return (
            <section
              key={lane}
              aria-label={lane}
              className="flex w-[272px] shrink-0 snap-start flex-col gap-2.5"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display text-[14.5px] font-bold text-cream">
                  {lane}
                </h2>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-sand">
                  {laneTasks.length}
                </span>
              </div>
              {laneTasks.map((t) => (
                <TaskCardView key={t.id} task={t} onOpen={() => setSelected(t)} />
              ))}
              {laneTasks.length === 0 && (
                <p className="rounded-[14px] border border-dashed border-white/10 p-4 text-center text-[12px] text-clay">
                  Nothing here
                </p>
              )}
            </section>
          );
        })}
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected && (
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={PRIORITY_TONE[selected.priority]}>
                {selected.priority === "med" ? "Medium" : selected.priority === "high" ? "High" : "Low"} priority
              </Chip>
              <Chip tone="outline">{selected.source}</Chip>
              <Chip tone={selected.overdue ? "alert" : "neutral"}>
                {selected.overdue ? "Overdue" : `Due ${selected.due}`}
              </Chip>
            </div>

            <div className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-elevated p-3">
              <AgentAvatar
                agentId={selected.assigneeId}
                name={agentById(selected.assigneeId)?.name ?? "?"}
                size={40}
              />
              <div>
                <p className="text-[14px] font-semibold text-cream">
                  {agentById(selected.assigneeId)?.name ?? "Unassigned"}
                </p>
                <p className="text-[12px] text-clay">
                  {agentById(selected.assigneeId)?.role ?? "Pick an owner"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="primary" size="md">
                <span className="flex items-center gap-2">
                  <Bot size={16} /> Assign to agent
                </span>
              </Button>
              <Button variant="ghost" size="md">
                <span className="flex items-center gap-2">
                  <Sparkles size={16} /> Auto-summarize
                </span>
              </Button>
              <Button variant="ghost" size="md">
                <span className="flex items-center gap-2">
                  <ListChecks size={16} /> Generate next steps
                </span>
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function TaskCardView({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const SourceIcon = SOURCE_ICON[task.source];
  const assignee = agentById(task.assigneeId);
  return (
    <button
      onClick={onOpen}
      className="flex flex-col gap-2.5 rounded-[16px] border border-white/8 bg-elevated p-3.5 text-left transition active:scale-[0.98]"
    >
      <p className="text-[14px] font-semibold leading-snug text-cream">
        {task.title}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="outline">
          <SourceIcon size={11} /> {task.source}
        </Chip>
        <Chip tone={PRIORITY_TONE[task.priority]}>
          {task.priority === "med" ? "Med" : task.priority === "high" ? "High" : "Low"}
        </Chip>
        {task.overdue && <Chip tone="alert">Overdue</Chip>}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex flex-1 items-center gap-1.5">
          <AgentAvatar agentId={task.assigneeId} name={assignee?.name ?? "?"} size={22} />
          <span className="text-[11.5px] text-sand">{assignee?.name}</span>
        </span>
        <span className={`text-[11.5px] ${task.overdue ? "text-alert" : "text-clay"}`}>
          {task.due}
        </span>
      </div>
    </button>
  );
}
