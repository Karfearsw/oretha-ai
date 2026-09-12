"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Pin } from "lucide-react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip, StatusDot } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { AgentDetailSheet } from "@/components/chats/AgentDetailSheet";
import { AGENTS } from "@/lib/mock/agents";
import { THREADS } from "@/lib/mock/threads";
import type { ThreadCategory, Agent } from "@/lib/types";

const FILTERS: ("All" | ThreadCategory)[] = [
  "All",
  "Work",
  "Code",
  "Real Estate",
  "Media",
  "Personal",
];

export default function ChatsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [detail, setDetail] = useState<Agent | null>(null);

  const threads = useMemo(
    () =>
      filter === "All"
        ? THREADS
        : THREADS.filter((t) => t.category === filter),
    [filter],
  );

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
            onClick={() => router.push("/chats/t1")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-canvas"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}>
            <Chip tone={filter === f ? "gold" : "outline"}>{f}</Chip>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col divide-y divide-white/6">
        {threads.map((t) => (
          <Link
            key={t.id}
            href={`/chats/${t.id}`}
            className="flex items-center gap-3 py-3 transition active:bg-white/4"
          >
            <span className="relative">
              <AgentAvatar
                agentId={t.agentIds[0]}
                name={t.agentIds[0]}
                size={46}
              />
              {t.running && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-canvas">
                  <span className="anim-pulse-dot h-2 w-2 rounded-full bg-gold" />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-[15px] font-bold text-cream">
                  {t.title}
                </span>
                <span className="shrink-0 text-[11px] text-clay">{t.time}</span>
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-[13px] text-sand">
                  {t.preview}
                </span>
                {t.unread ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-canvas">
                    {t.unread}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        ))}
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
                <Link href={`/chats/t1?agent=${a.id}`}>
                  <Button size="sm" variant="primary">
                    Launch
                  </Button>
                </Link>
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
        <Link
          href="/chats/t1"
          className="flex items-center gap-3 rounded-full border border-white/10 bg-elevated px-4 py-3.5 text-[15px] text-clay"
        >
          <Plus size={18} />
          Message Oretha…
        </Link>
      </div>

      <Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && <AgentDetailSheet agent={detail} onLaunch={() => router.push("/chats/t1")} />}
      </Sheet>
    </main>
  );
}
