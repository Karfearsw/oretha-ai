"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Pin } from "lucide-react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip, StatusDot } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { AgentDetailSheet } from "@/components/chats/AgentDetailSheet";
import { AGENTS } from "@/lib/mock/agents";
import type { Agent } from "@/lib/types";

interface ThreadRow {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
  preview: string;
}

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
  const [detail, setDetail] = useState<Agent | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/threads");
    if (res.ok) setThreads((await res.json()).threads ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function newChat() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/threads", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/chats/${data.thread.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  const recent = AGENTS.filter((a) => a.pinned);

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
            onClick={newChat}
            disabled={creating}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-canvas disabled:opacity-60"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-col divide-y divide-white/6">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-clay">Loading…</p>
        ) : threads.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/10 p-6 text-center">
            <p className="text-[13px] leading-snug text-sand">
              No conversations yet. Say something — she already knows your
              files, your rules, and your memory.
            </p>
          </div>
        ) : (
          threads.map((t) => (
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
                  <span className="truncate font-display text-[15px] font-bold text-cream">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-clay">
                    {timeAgo(t.updatedAt)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-sand">
                  {t.preview || "New conversation"}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>

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
                <Button size="sm" variant="primary" onClick={newChat}>
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

      <div className="mt-5 mb-2">
        <button
          onClick={newChat}
          className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-elevated px-4 py-3.5 text-[15px] text-clay"
        >
          <Plus size={18} />
          Message {detail?.name ?? "Oretha"}…
        </button>
      </div>

      <Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && <AgentDetailSheet agent={detail} onLaunch={newChat} />}
      </Sheet>
    </main>
  );
}
