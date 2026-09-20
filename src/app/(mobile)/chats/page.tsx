"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Pin, BriefcaseBusiness, Code2, ShieldCheck } from "lucide-react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AgentDetailSheet } from "@/components/chats/AgentDetailSheet";
import { useSessionUser } from "@/components/layout/AppShell";
import { AGENTS } from "@/lib/mock/agents";
import type { Agent } from "@/lib/types";
import type { DevMode } from "@/lib/devMode";
import { normalizeMode } from "@/lib/devMode";

interface ThreadRow {
  id: string;
  slug: string;
  title: string;
  mode: DevMode;
  cloudEnv: string;
  repoName: string | null;
  branchName: string | null;
  updatedAt: string;
  preview: string;
}

const MODE_ITEMS = [
  { value: "work", label: "Work", icon: BriefcaseBusiness },
  { value: "code", label: "Code", icon: Code2 },
] as const;

const WORK_CHIPS = [
  "Research this topic",
  "Mine data for insights",
  "Draft inspired content",
  "Control my computer",
];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChatsPage() {
  const router = useRouter();
  const sessionUser = useSessionUser();
  const [detail, setDetail] = useState<Agent | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<DevMode>(
    normalizeMode(sessionUser?.defaultMode),
  );

  useEffect(() => {
    setMode(normalizeMode(sessionUser?.defaultMode));
  }, [sessionUser?.defaultMode]);

  const load = useCallback(async () => {
    const res = await fetch("/api/threads");
    if (res.ok) setThreads((await res.json()).threads ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function persistMode(nextMode: DevMode) {
    setMode(nextMode);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultMode: nextMode }),
    }).catch(() => {});
    router.refresh();
  }

  async function newChat(opts?: { prompt?: string }) {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        const prompt = opts?.prompt ? `?prompt=${encodeURIComponent(opts.prompt)}` : "";
        router.push(`/chats/${data.thread.id}${prompt}`);
      }
    } finally {
      setCreating(false);
    }
  }

  const recent = AGENTS.filter((a) => a.pinned);
  const filteredThreads = useMemo(
    () => threads.filter((thread) => thread.mode === mode),
    [threads, mode],
  );

  return (
    <main className="pad-safe-top flex flex-col px-4 pt-2">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[26px] font-bold text-cream">Chats</h1>
        <div className="flex items-center gap-2">
          <button
            aria-label="Search chats"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-sand"
          >
            <Search size={18} />
          </button>
          <button
            aria-label="New chat"
            onClick={() => newChat()}
            disabled={creating}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-canvas disabled:opacity-60"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <div className="mt-3">
        <SegmentedControl items={[...MODE_ITEMS]} value={mode} onChange={persistMode} />
      </div>

      {mode === "work" ? (
        <section className="mt-3 rounded-[18px] border border-white/8 bg-elevated p-4">
          <p className="font-display text-[15px] font-bold text-cream">
            How can Oretha help today?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WORK_CHIPS.map((label) => (
              <button
                key={label}
                onClick={() => newChat({ prompt: label })}
                className="rounded-full border border-gold/25 bg-gold/10 px-3.5 py-2 text-[12.5px] font-semibold text-gold transition active:scale-[0.98]"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-3 rounded-[18px] border border-gold/20 bg-gradient-to-br from-gold/10 to-violet/10 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold text-cream">
                Run preview before updates
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-sand">
                Code mode always shows Plan, Risks, and Next Step before any write-style request.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="mt-4 flex flex-col divide-y divide-white/6">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-clay">Loading…</p>
        ) : filteredThreads.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/10 p-6 text-center">
            <p className="text-[13px] leading-snug text-sand">
              {mode === "code"
                ? "No code threads yet. Start one to pick a branch and work with a preview gate."
                : "No conversations yet. Say something — she already knows your files, your rules, and your memory."}
            </p>
          </div>
        ) : (
          filteredThreads.map((t) => (
            <Link
              key={t.id}
              href={`/chats/${t.id}`}
              className="flex items-center gap-3 py-3 transition active:bg-white/4"
            >
              <span className="relative">
                <AgentAvatar agentId="oretha" name="Oretha" size={46} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-display text-[15px] font-bold text-cream">
                      {t.title}
                    </span>
                    <Chip tone={t.mode === "code" ? "violet" : "gold"}>
                      {t.mode === "code" ? "Code" : "Work"}
                    </Chip>
                  </span>
                  <span className="shrink-0 text-[11px] text-clay">
                    {timeAgo(t.updatedAt)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-sand">
                  {t.mode === "code" && (t.repoName || t.branchName)
                    ? `${t.repoName ?? "Repo not set"} · ${t.branchName ?? "Branch not set"}`
                    : t.preview || "New conversation"}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>

      {mode === "work" ? (
        <>
          <section aria-label="Recent agents" className="mt-5">
            <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
              Quick launch
            </h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {recent.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setDetail(a)}
                  className="flex w-[104px] shrink-0 flex-col items-center gap-1.5 rounded-[16px] border border-white/8 bg-elevated p-3 transition active:scale-[0.97]"
                >
                  <AgentAvatar agentId={a.id} name={a.name} size={44} status={a.status} />
                  <span className="truncate text-[12px] font-semibold text-cream">
                    {a.name}
                  </span>
                  <span className="line-clamp-1 text-[10.5px] text-clay">
                    {a.role}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Agent gallery" className="mt-5">
            <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
              Agent Gallery
            </h2>
            <div className="flex flex-col gap-2.5">
              {AGENTS.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-3.5"
                >
                  <AgentAvatar agentId={a.id} name={a.name} size={44} status={a.status} />
                  <button
                    onClick={() => setDetail(a)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate font-display text-[15px] font-bold text-cream">
                        {a.name}
                      </span>
                      <Chip tone="violet">{a.domain}</Chip>
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-sand">
                      {a.description}
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => newChat()}>
                      Launch
                    </Button>
                    <span className="flex items-center gap-1 text-[10.5px] text-clay">
                      <Pin size={10} className={a.pinned ? "text-gold" : ""} />
                      {a.pinned ? "Pinned" : "Pin"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section aria-label="Code mode" className="mt-5 rounded-[18px] border border-white/8 bg-elevated p-4">
          <p className="font-display text-[15px] font-bold text-cream">
            Talk to Oretha, deliver your code
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-sand">
            Pick a repo and branch inside each thread. Code mode keeps its own history and blocks silent write-style moves until you approve the preview.
          </p>
        </section>
      )}

      <div className="mt-5 mb-2">
        <button
          onClick={() => newChat()}
          className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-elevated px-4 py-3.5 text-[15px] text-clay"
        >
          <Plus size={18} />
          {mode === "code"
            ? "Start a code thread…"
            : `Message ${detail?.name ?? "Oretha"}…`}
        </button>
      </div>

      <Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && <AgentDetailSheet agent={detail} onLaunch={() => newChat()} />}
      </Sheet>
    </main>
  );
}
