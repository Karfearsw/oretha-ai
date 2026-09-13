"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Workflow as WorkflowIcon,
  Plus,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  Sparkles,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

interface WorkflowRow {
  id: string;
  name: string;
  action: string;
  prompt: string | null;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastRun: { status: string; summary: string; at: string } | null;
}

interface RunRow {
  id: string;
  workflow: string;
  status: string;
  summary: string;
  at: string;
}

const ACTION_LABEL: Record<string, string> = {
  mail_triage: "Triage my mail",
  custom_prompt: "Run a custom prompt",
};

const SCHEDULES = ["hourly", "daily", "weekly"] as const;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [action, setAction] = useState<"mail_triage" | "custom_prompt">("mail_triage");
  const [prompt, setPrompt] = useState("");
  const [schedule, setSchedule] = useState<(typeof SCHEDULES)[number]>("daily");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [wfRes, runRes] = await Promise.all([
      fetch("/api/workflows"),
      fetch("/api/runs/recent"),
    ]);
    if (wfRes.ok) setWorkflows((await wfRes.json()).workflows ?? []);
    if (runRes.ok) setRuns((await runRes.json()).runs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action, prompt: action === "custom_prompt" ? prompt : null, schedule }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(data?.error ?? "Couldn't save. Try again.");
        return;
      }
      setCreateOpen(false);
      setName("");
      setPrompt("");
      setSchedule("daily");
      setAction("mail_triage");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(wf: WorkflowRow) {
    setBusyId(wf.id);
    await fetch(`/api/workflows/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !wf.enabled }),
    });
    await load();
    setBusyId(null);
  }

  async function runNow(wf: WorkflowRow) {
    setBusyId(wf.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/workflows/${wf.id}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setNotice(
          data.run?.status === "complete"
            ? data.run.summary
            : (data.run?.summary ?? "Run finished"),
        );
      } else {
        setNotice("Run failed — check the history below.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(wf: WorkflowRow) {
    setBusyId(wf.id);
    await fetch(`/api/workflows/${wf.id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  return (
    <main className="pad-safe-top flex flex-col gap-4 px-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold text-cream">Workflows</h1>
          <p className="mt-0.5 text-[13px] text-sand">
            Automations that run while you sleep. For real.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          aria-label="New workflow"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet text-canvas"
        >
          <Plus size={20} />
        </button>
      </header>

      {notice && (
        <p className="rounded-[12px] border border-complete/30 bg-complete/10 px-3.5 py-2.5 text-[12.5px] leading-snug text-complete">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-[13px] text-clay">Loading…</p>
      ) : workflows.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-white/12 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gold/12 text-gold">
            <WorkflowIcon size={22} />
          </span>
          <p className="font-display text-[16px] font-bold text-cream">
            No workflows yet
          </p>
          <p className="max-w-[260px] text-[13px] leading-snug text-sand">
            Put your mailroom on a schedule, or have your agent run a prompt
            every morning — inbox briefings, research sweeps, anything.
          </p>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <span className="flex items-center gap-2">
              <Plus size={15} /> Create your first
            </span>
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-2.5">
          {workflows.map((wf) => (
            <article
              key={wf.id}
              className="flex flex-col gap-2.5 rounded-[16px] border border-white/8 bg-elevated p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-bold text-cream">
                    {wf.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-clay">
                    {wf.action === "mail_triage" ? (
                      <Mail size={11} />
                    ) : (
                      <Sparkles size={11} />
                    )}
                    {ACTION_LABEL[wf.action] ?? wf.action} · {wf.schedule}
                  </p>
                </div>
                {/* enable toggle */}
                <button
                  onClick={() => toggle(wf)}
                  disabled={busyId === wf.id}
                  aria-label={wf.enabled ? "Disable" : "Enable"}
                  className={`flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                    wf.enabled ? "border-gold/60 bg-gold/30" : "border-white/15 bg-white/8"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full transition-all ${
                      wf.enabled ? "ml-[26px] bg-gold" : "ml-[3px] bg-sand"
                    }`}
                  />
                </button>
              </div>

              {wf.action === "custom_prompt" && wf.prompt && (
                <p className="line-clamp-2 rounded-[10px] bg-white/5 px-3 py-2 text-[12px] leading-snug text-sand">
                  “{wf.prompt}”
                </p>
              )}

              {wf.lastRun && (
                <p className="flex items-start gap-1.5 text-[12px] leading-snug text-clay">
                  {wf.lastRun.status === "complete" ? (
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-complete" />
                  ) : wf.lastRun.status === "failed" ? (
                    <XCircle size={13} className="mt-0.5 shrink-0 text-alert" />
                  ) : (
                    <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-gold" />
                  )}
                  <span className="line-clamp-2">{wf.lastRun.summary || "Running…"}</span>
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-clay">
                  {wf.lastRunAt ? `Last run ${timeAgo(wf.lastRunAt)}` : "Never run"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runNow(wf)}
                    disabled={busyId === wf.id}
                    className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/12 px-3 py-1.5 text-[12px] font-semibold text-gold transition active:scale-95 disabled:opacity-50"
                  >
                    {busyId === wf.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} />
                    )}
                    Run now
                  </button>
                  <button
                    onClick={() => remove(wf)}
                    disabled={busyId === wf.id}
                    aria-label="Delete workflow"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-clay transition hover:text-alert disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {runs.length > 0 && (
        <section className="mt-2">
          <h2 className="mb-2.5 flex items-center gap-2 font-display text-[16px] font-bold text-cream">
            <Clock size={15} className="text-clay" /> Recent runs
          </h2>
          <div className="flex flex-col gap-2">
            {runs.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-2.5 rounded-[14px] border border-white/8 bg-elevated px-3.5 py-3"
              >
                {r.status === "complete" ? (
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-complete" />
                ) : r.status === "failed" ? (
                  <XCircle size={15} className="mt-0.5 shrink-0 text-alert" />
                ) : (
                  <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-gold" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2 text-[13.5px] font-semibold text-cream">
                    <span className="truncate">{r.workflow}</span>
                    <span className="shrink-0 text-[11px] font-normal text-clay">
                      {timeAgo(r.at)}
                    </span>
                  </p>
                  {r.summary && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-sand">
                      {r.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="pb-2 text-center text-[11.5px] text-clay">
        Swept automatically on schedule ·{" "}
        <Link href="/office" className="underline decoration-white/20">
          back to the office
        </Link>
      </p>

      {/* Create sheet */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="New workflow">
        <div className="flex flex-col gap-4 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-sand">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning inbox sweep"
              maxLength={80}
              className="h-13 w-full rounded-[14px] border border-white/12 bg-canvas px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
            />
          </label>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-sand">Action</p>
            <div className="grid grid-cols-2 gap-2">
              {(["mail_triage", "custom_prompt"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`rounded-[14px] border p-3.5 text-left transition ${
                    action === a ? "border-gold/60 bg-gold/12" : "border-white/10 bg-elevated"
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 text-[14px] font-semibold ${
                      action === a ? "text-gold" : "text-cream"
                    }`}
                  >
                    {a === "mail_triage" ? <Mail size={14} /> : <Sparkles size={14} />}
                    {ACTION_LABEL[a]}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-clay">
                    {a === "mail_triage"
                      ? "Sync + triage every inbox onto the board"
                      : "Your agent runs a prompt you write"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {action === "custom_prompt" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-sand">Prompt</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Scan my mail for invoices and list anything due this week…"
                className="w-full resize-none rounded-[14px] border border-white/12 bg-canvas px-4 py-3 text-[15px] leading-snug text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
          )}

          <div>
            <p className="mb-2 text-[13px] font-semibold text-sand">Schedule</p>
            <div className="grid grid-cols-3 gap-2">
              {SCHEDULES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSchedule(s)}
                  className={`rounded-[14px] border py-3 text-center text-[14px] font-semibold capitalize transition ${
                    schedule === s
                      ? "border-gold/60 bg-gold/12 text-gold"
                      : "border-white/10 bg-elevated text-cream"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {saveError && <p className="text-[12.5px] text-alert">{saveError}</p>}

          <Button
            variant="gradient"
            size="lg"
            onClick={create}
            disabled={saving || !name.trim()}
          >
            <span className="flex items-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? "Saving…" : "Create workflow"}
            </span>
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
