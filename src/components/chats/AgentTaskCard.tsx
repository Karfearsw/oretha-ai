"use client";

/* Inline delegated-task card for the chat thread (OpenMuse "Activity").
 * Shows the plan steps with live status + receipts, and the controls
 * (approve / pause / resume / cancel / retry). Polls while running so the
 * plan visibly advances without a page refresh. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react";
import { Chip } from "@/components/ui/Chip";

export interface PlanStepView {
  label: string;
  detail: string;
  status: "pending" | "running" | "complete" | "failed";
  receipt?: string;
}

interface TaskState {
  id: string;
  status: string;
  steps: PlanStepView[];
  currentStep: number;
  summary: string;
  lastError: string | null;
}

const POLL_MS = 2000;

const STATUS_LABEL: Record<string, string> = {
  awaiting_approval: "Waiting for your approval",
  running: "Working…",
  paused: "Paused",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

function actionButton(
  label: string,
  icon: React.ReactNode,
  onClick: () => void,
  primary = false,
) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition active:scale-95 ${
        primary
          ? "bg-gradient-to-br from-gold to-violet text-canvas"
          : "border border-white/12 bg-white/5 text-sand hover:text-cream"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function AgentTaskCard({
  taskId,
  onStatusChange,
}: {
  taskId: string;
  /** Let the thread know the task state (e.g. to stop polling styling). */
  onStatusChange?: (status: string) => void;
}) {
  const [task, setTask] = useState<TaskState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-tasks/${taskId}`);
      if (!res.ok) {
        setError(res.status === 404 ? "This task was deleted." : "Couldn't load the task.");
        return;
      }
      const d = await res.json();
      if (d?.task) {
        setTask(d.task);
        setError(null);
        onStatusChange?.(d.task.status);
      }
    } catch {
      /* transient — keep polling */
    }
  }, [taskId, onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll only while the task is actually moving.
  useEffect(() => {
    if (task?.status === "running") {
      pollRef.current = setInterval(load, POLL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    return;
  }, [task?.status, load]);

  async function act(action: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-tasks/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error ?? "That action didn't go through.");
        return;
      }
      await load();
    } catch {
      setError("Network dropped — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!task)
    return (
      <div className="flex items-center gap-2 rounded-[16px] border border-white/8 bg-elevated px-4 py-3.5 text-[13px] text-clay">
        <Loader2 size={14} className="animate-spin" /> Loading task…
      </div>
    );

  const tone =
    task.status === "complete"
      ? "complete"
      : task.status === "failed" || task.status === "cancelled"
        ? "alert"
        : task.status === "running"
          ? "gold"
          : "neutral";

  return (
    <div className="overflow-hidden rounded-[16px] border border-white/8 bg-elevated">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold text-cream">{task.summary || "Delegated task"}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Chip tone={tone as "complete" | "alert" | "gold" | "neutral"}>
              {task.status === "running" && (
                <Loader2 size={11} className="animate-spin" />
              )}
              {STATUS_LABEL[task.status] ?? task.status}
            </Chip>
            <span className="text-[11.5px] text-clay">
              {task.steps.length} step{task.steps.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3.5">
        {task.steps.map((s, i) => (
          <div key={`${s.label}-${i}`} className="flex items-start gap-2.5">
            {s.status === "complete" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-complete" />
            ) : s.status === "failed" ? (
              <XCircle size={16} className="mt-0.5 shrink-0 text-alert" />
            ) : s.status === "running" ? (
              <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-gold" />
            ) : (
              <CircleDashed size={16} className="mt-0.5 shrink-0 text-clay" />
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-cream">{s.label}</p>
              <p className="text-[12px] leading-snug text-clay">{s.detail}</p>
              {s.receipt && (
                <p className="mt-1 rounded-[8px] bg-white/5 px-2.5 py-1.5 text-[11.5px] leading-snug text-sand">
                  {s.receipt}
                </p>
              )}
            </div>
          </div>
        ))}

        {task.lastError && (
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-alert">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {task.lastError}
          </p>
        )}
        {error && <p className="text-[12px] text-alert">{error}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {task.status === "awaiting_approval" &&
            actionButton("Approve & start", <ThumbsUp size={14} />, () => act("approve"), true)}
          {task.status === "running" &&
            actionButton("Pause", <Pause size={14} />, () => act("pause"))}
          {task.status === "paused" &&
            actionButton("Resume", <Play size={14} />, () => act("resume"), true)}
          {(task.status === "failed" || task.status === "cancelled") &&
            actionButton("Retry", <RotateCcw size={14} />, () => act("retry"), true)}
          {(task.status === "awaiting_approval" ||
            task.status === "running" ||
            task.status === "paused") &&
            actionButton("Cancel", <XCircle size={14} />, () => act("cancel"))}
          {busy && <Loader2 size={14} className="animate-spin self-center text-clay" />}
        </div>
      </div>
    </div>
  );
}
