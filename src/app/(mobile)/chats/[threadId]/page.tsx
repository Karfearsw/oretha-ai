"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  X,
  Ellipsis,
  List,
  ShieldCheck,
  History,
  Fingerprint,
  Plus,
  Mic,
  ArrowUp,
  Square,
  FileText,
  ChevronRight,
} from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentItem } from "@/components/ui/SegmentedControl";
import { FileSheet } from "@/components/ui/FileSheet";
import { AgentRunRow } from "@/components/hub/AgentRunRow";
import { AgentAvatar } from "@/components/ui/Avatar";
import { OrethaMark } from "@/components/ui/OrethaMark";
import { Chip } from "@/components/ui/Chip";
import { agentById } from "@/lib/mock/agents";
import { MESSAGES, RUNS, THREADS } from "@/lib/mock/threads";
import { SOUL_MD, MEMORY_MD, IDENTITY_MD } from "@/lib/mock/content";
import type { ChatMessage } from "@/lib/types";

type Seg = "activity" | "guardrails" | "memory" | "files";

const SEGMENTS: SegmentItem<Seg>[] = [
  { value: "activity", label: "Activity", icon: List },
  { value: "guardrails", label: "Guardrails", icon: ShieldCheck },
  { value: "memory", label: "Memory", icon: History },
  { value: "files", label: "Files", icon: Fingerprint },
];

const MEMORY_FILES = [
  { name: "SOUL.md", content: SOUL_MD },
  { name: "MEMORY.md", content: MEMORY_MD },
  { name: "IDENTITY.md", content: IDENTITY_MD },
];

export default function ChatRoomPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;
  const thread = THREADS.find((t) => t.id === threadId) ?? THREADS[0];
  const lead = agentById(thread.agentIds[0]) ?? agentById("oretha")!;

  const [seg, setSeg] = useState<Seg>("activity");
  const [messages, setMessages] = useState<ChatMessage[]>(
    MESSAGES[threadId] ?? [
      {
        id: "seed",
        role: "oretha",
        text: `This is your ${thread.title} thread. What are we getting into?`,
        time: "9:00 AM",
      },
    ],
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(thread.running ?? false);
  const [fileOpen, setFileOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: "user", text, time: "Now" },
    ]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `o${Date.now()}`,
          role: "oretha",
          text: "Say less — I'm on it. I'll pull the context, draft the plan, and loop in whoever needs to move.",
          time: "Now",
          toolLabel: "Delegated to 2 agents",
        },
      ]);
      setBusy(false);
    }, 1400);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      {/* Header */}
      <header className="pad-safe-top sticky top-0 z-20 bg-canvas/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <Link
            href="/chats"
            aria-label="Close chat"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-cream"
          >
            <X size={20} />
          </Link>
          <div className="flex flex-col items-center gap-1.5">
            {lead.id === "oretha" ? (
              <OrethaMark size={52} />
            ) : (
              <AgentAvatar agentId={lead.id} name={lead.name} size={52} status={lead.status} />
            )}
            <span className="rounded-full bg-elevated px-3.5 py-1.5 text-center">
              <span className="block font-display text-[13px] font-bold leading-tight text-cream">
                {lead.name}
              </span>
              <span className="block text-[11.5px] leading-tight text-sand">
                {busy ? "is working" : "is ready"}
              </span>
            </span>
          </div>
          <button
            aria-label="Chat options"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-cream"
          >
            <Ellipsis size={20} />
          </button>
        </div>
        <div className="px-4 pb-2">
          <SegmentedControl items={SEGMENTS} value={seg} onChange={setSeg} iconOnly />
        </div>
      </header>

      {/* Body */}
      <div ref={listRef} className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
        {seg === "activity" && (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-center text-[11px] font-medium uppercase tracking-widest text-clay">
              Today
            </p>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {busy && <TypingDots />}
            {RUNS.filter((r) => r.status === "running").map((run) => (
              <AgentRunRow key={run.id} run={run} />
            ))}
          </div>
        )}

        {seg === "guardrails" && (
          <div className="flex flex-col gap-3 pt-3">
            <GuardrailCard
              title="Censorship level"
              body="Open mode. Oretha answers straight, with legal and safety guardrails only."
              chip="Open"
              tone="gold"
            />
            <GuardrailCard
              title="Tool permissions"
              body="Agents can read connected sources and draft, but only you can approve sends, spends, and deletes."
              chip="Ask first"
              tone="violet"
            />
            <GuardrailCard
              title="Data handling"
              body="Threads stay on your devices and your cloud. Nothing is sold, nothing trains third parties."
              chip="Private"
              tone="complete"
            />
          </div>
        )}

        {seg === "memory" && (
          <div className="flex flex-col gap-2.5 pt-3">
            <p className="text-[13px] leading-snug text-sand">
              The files that make Oretha yours. Tap to read or edit.
            </p>
            {MEMORY_FILES.map((f) => (
              <button
                key={f.name}
                onClick={() => setFileOpen(f.name)}
                className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet/20 text-[#c4b5fd]">
                  <FileText size={18} />
                </span>
                <span className="flex-1">
                  <span className="block font-mono text-[14px] font-semibold text-cream">
                    {f.name}
                  </span>
                  <span className="block text-[12px] text-clay">
                    Persona · memory · identity
                  </span>
                </span>
                <ChevronRight size={18} className="text-clay" />
              </button>
            ))}
          </div>
        )}

        {seg === "files" && (
          <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <FileText size={28} className="text-clay" />
            <p className="text-[14px] font-semibold text-cream">No files yet</p>
            <p className="max-w-[240px] text-[12.5px] text-clay">
              Attachments and generated files from this thread will stack up here.
            </p>
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="sticky bottom-0 z-20 bg-gradient-to-t from-canvas via-canvas to-transparent px-4 pb-4 pt-2"
        style={{ paddingBottom: "calc(16px + var(--safe-bottom))" }}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-elevated py-1.5 pl-3 pr-1.5">
          <button aria-label="Add attachment" className="text-sand">
            <Plus size={20} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message in ${thread.title}…`}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-clay"
          />
          {input.trim() === "" && (
            <button aria-label="Voice message" className="px-1 text-sand">
              <Mic size={20} />
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={send}
            aria-label={busy ? "Stop" : "Send"}
            className={`flex h-10 w-10 items-center justify-center rounded-full ${busy ? "bg-white text-canvas" : input.trim() ? "bg-gradient-to-br from-gold to-violet text-canvas" : "bg-white/10 text-clay"}`}
          >
            {busy ? (
              <Square size={14} fill="currentColor" />
            ) : (
              <ArrowUp size={18} strokeWidth={2.5} />
            )}
          </motion.button>
        </div>
      </div>

      <FileSheet
        open={fileOpen !== null}
        filename={fileOpen ?? ""}
        content={MEMORY_FILES.find((f) => f.name === fileOpen)?.content ?? ""}
        onClose={() => setFileOpen(null)}
      />
    </main>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "rounded-br-[8px] bg-bubble text-cream"
            : "rounded-bl-[8px] bg-elevated text-cream"
        }`}
      >
        {message.toolLabel && (
          <Chip tone="violet" className="mb-1.5">
            {message.toolLabel}
          </Chip>
        )}
        {message.text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="anim-typing flex items-center gap-1.5 rounded-[20px] rounded-bl-[8px] bg-elevated px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-sand" />
        <span className="h-1.5 w-1.5 rounded-full bg-sand" />
        <span className="h-1.5 w-1.5 rounded-full bg-sand" />
      </div>
    </div>
  );
}

function GuardrailCard({
  title,
  body,
  chip,
  tone,
}: {
  title: string;
  body: string;
  chip: string;
  tone: "gold" | "violet" | "complete";
}) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-[15px] font-bold text-cream">{title}</p>
        <Chip tone={tone}>{chip}</Chip>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-sand">{body}</p>
    </div>
  );
}
