"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Sparkles,
  Mail,
  NotebookPen,
  SquarePlus,
  KanbanSquare,
  Loader2,
  Pencil,
  Eraser,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentItem } from "@/components/ui/SegmentedControl";
import { FileSheet } from "@/components/ui/FileSheet";
import { AgentRunRow } from "@/components/hub/AgentRunRow";
import { OrethaMark } from "@/components/ui/OrethaMark";
import { Chip } from "@/components/ui/Chip";
import { generateAgentFiles } from "@/lib/agentFiles";
import { useSessionUser } from "@/components/layout/AppShell";
import type { ChatMessage } from "@/lib/types";

type Seg = "activity" | "guardrails" | "memory" | "files";

/* Minimal Web Speech API types (not in the standard DOM lib). */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

const SEGMENTS: SegmentItem<Seg>[] = [
  { value: "activity", label: "Activity", icon: List },
  { value: "guardrails", label: "Guardrails", icon: ShieldCheck },
  { value: "memory", label: "Memory", icon: History },
  { value: "files", label: "Files", icon: Fingerprint },
];

interface UiMessage {
  id: string;
  role: ChatMessage["role"];
  text: string;
  time: string;
  toolLabel?: string;
}

function nowLabel() {
  return new Date()
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* Speak a finished reply aloud (browser TTS). */
function speakAloud(text: string) {
  if (typeof speechSynthesis === "undefined" || !text.trim()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 600));
  u.rate = 1.02;
  speechSynthesis.speak(u);
}

export default function ChatRoomPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = params.threadId;
  // Real thread from the DB; unknown slugs fall back to the newest real thread.
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const sessionUser = useSessionUser();
  const agentName = sessionUser?.agentName || "Oretha";

  const [seg, setSeg] = useState<Seg>("activity");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const [fileOpen, setFileOpen] = useState<string | null>(null);
  const [dbFiles, setDbFiles] = useState<Record<string, string>>({});
  const [plusOpen, setPlusOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [speakReplies, setSpeakReplies] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [mailBusy, setMailBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const speakRepliesRef = useRef(false);
  speakRepliesRef.current = speakReplies;

  // Deep-link handoff (e.g. Media Lab "Send to the crew"): prefill the composer.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("prompt");
    if (q) {
      setInput(q);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Load the real thread (title) — and if the slug is unknown, bounce to the newest one.
  useEffect(() => {
    let alive = true;
    fetch("/api/threads")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.threads) return;
        const found = d.threads.find(
          (t: { id: string; slug: string; title: string }) =>
            t.id === threadId || t.slug === threadId,
        );
        if (found) {
          if (found.id !== threadId) router.replace(`/chats/${found.id}`);
          setThreadTitle(found.title);
        } else if (d.threads.length > 0) {
          router.replace(`/chats/${d.threads[0].id}`);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [threadId, router]);

  // templates from her setup answers (fallback until DB files load)
  const MEMORY_FILES = useMemo(() => {
    const generated = generateAgentFiles({
      agentName,
      agentEmoji: sessionUser?.agentEmoji ?? "",
      voice: "balanced",
      censorship: "open",
      empowerment: sessionUser?.empowerment ?? true,
      responseLength: "balanced",
      timezone: null,
      userFirstName: sessionUser?.name?.split(" ")[0] ?? "friend",
      userWork: null,
      userInterests: [],
      mailboxApiKey: null,
    });
    return [
      { name: "SOUL.md", content: generated["SOUL.md"] },
      { name: "MEMORY.md", content: generated["MEMORY.md"] },
      { name: "IDENTITY.md", content: generated["IDENTITY.md"] },
    ];
  }, [agentName, sessionUser]);

  // real persisted files win once loaded
  useEffect(() => {
    fetch("/api/agent-files")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const map: Record<string, string> = {};
        for (const f of d?.files ?? []) map[f.name] = f.content;
        setDbFiles(map);
      })
      .catch(() => {});
    fetch("/api/llm-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLlmReady(Boolean(d?.configured)))
      .catch(() => setLlmReady(false));
  }, []);

  // real thread history: /chats/<dbId> by id, legacy /chats/t1 via slug
  useEffect(() => {
    setLoaded(false);
    setMessages([]);
    let url = `/api/threads/${threadId}/messages`;
    if (/^t\d+$/.test(threadId)) {
      fetch("/api/threads")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const match = (d?.threads ?? []).find((t: { slug: string }) =>
            t.slug === threadId,
          );
          if (!match) {
            // no such thread yet — create it and swap the URL
            fetch("/api/threads", { method: "POST" })
              .then((r) => (r.ok ? r.json() : null))
              .then((c) => {
                if (c?.thread) router.replace(`/chats/${c.thread.id}`);
                else setLoaded(true);
              })
              .catch(() => setLoaded(true));
            return;
          }
          return loadHistory(match.id);
        })
        .catch(() => setLoaded(true));
    } else {
      loadHistory(threadId);
    }

    async function loadHistory(id: string) {
      try {
        const r = await fetch(`/api/threads/${id}/messages`);
        if (!r.ok) return setLoaded(true);
        const d = await r.json();
        setMessages(
          (d.messages ?? []).map(
            (m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role === "user" ? "user" : "oretha",
              text: m.content,
              time: new Date(m.createdAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
            }),
          ),
        );
      } catch {
        /* keep whatever we have */
      } finally {
        setLoaded(true);
      }
    }
  }, [threadId, router]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streaming, busy]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (streaming !== null && streaming.trim()) {
      setMessages((m) => [
        ...m,
        {
          id: `o-stop-${Date.now()}`,
          role: "oretha",
          text: streaming,
          time: nowLabel(),
        },
      ]);
    }
    setStreaming(null);
    setBusy(false);
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;

    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: "user", text, time: nowLabel() },
    ]);
    setInput("");
    setBusy(true);
    setStreaming("");

    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message: text }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 503) {
          setStreaming(
            "My voice isn't wired up yet — add LLM_API_KEY on the server and I'll answer for real. Everything else is ready.",
          );
          return;
        }
        if (res.status === 404) {
          setStreaming("This chat went missing on my end. Start a new one?");
          return;
        }
        if (!res.ok || !res.body) {
          setStreaming("Something shorted out on my end — try that again.");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreaming(acc);
        }
        if (!acc.trim()) {
          setStreaming("Something shorted out on my end — try that again.");
        }
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setStreaming("Network dropped mid-thought. Try that again.");
      })
      .finally(() => {
        abortRef.current = null;
        setBusy(false);
        setStreaming((current) => {
          if (current !== null) {
            setMessages((m) => [
              ...m,
              {
                id: `o${Date.now()}`,
                role: "oretha",
                text: current,
                time: nowLabel(),
              },
            ]);
            if (speakRepliesRef.current) speakAloud(current);
          }
          return null;
        });
      });
  };

  /* ── Voice input (Web Speech API) ─────────────────────────────
   * Real speech-to-text where the browser supports it; honest
   * guidance where it doesn't. Transcripts land in the composer. */
  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceNote(
        "Voice input needs a Chromium browser (Chrome, Edge) or Safari — this browser doesn't expose speech recognition.",
      );
      setTimeout(() => setVoiceNote(null), 6000);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput(
        (prev) =>
          (prev ? `${prev.trimEnd()} ` : "") + (final || interim).trim(),
      );
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = (e) => {
      setListening(false);
      recRef.current = null;
      const kind = e?.error;
      setVoiceNote(
        kind === "not-allowed" || kind === "service-not-allowed"
          ? "Microphone access is blocked — allow it in the browser's site settings and try again."
          : kind === "no-speech"
            ? null
            : "Voice input hit a snag — try again, or just type it.",
      );
      if (kind !== "no-speech") setTimeout(() => setVoiceNote(null), 6000);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  /* Quick actions — every one wired to a production system. */
  const runMailSync = async () => {
    if (mailBusy) return;
    setMailBusy(true);
    try {
      const r = await fetch("/api/mail/sync", { method: "POST" });
      const d = await r.json().catch(() => null);
      const res = d?.results?.[0];
      setVoiceNote(
        res?.error
          ? `Mailroom hit a snag: ${String(res.error).slice(0, 120)}`
          : `Mailroom checked — ${res?.fetched ?? 0} new, ${res?.triaged ?? 0} triaged, ${res?.tasks ?? 0} task(s) on the board.`,
      );
    } catch {
      setVoiceNote("Mailroom check failed — network hiccup. Try again.");
    } finally {
      setMailBusy(false);
      setTimeout(() => setVoiceNote(null), 6000);
    }
  };

  const saveToMemory = () => {
    const text = input.trim();
    if (!text) {
      setVoiceNote("Type the fact first — I'll pin it to her memory.");
      setTimeout(() => setVoiceNote(null), 5000);
      return;
    }
    const current =
      dbFiles["MEMORY.md"] ??
      fileContent("MEMORY.md") ??
      "# Memory\n\n## Facts\n";
    const updated = `${current.trimEnd()}\n- ${text} (pinned ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})\n`;
    setDbFiles((f) => ({ ...f, "MEMORY.md": updated }));
    fetch("/api/agent-files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "MEMORY.md", content: updated }),
    });
    setInput("");
    setVoiceNote("Pinned to her memory — she'll carry it from now on.");
    setTimeout(() => setVoiceNote(null), 5000);
  };

  /* ── Chat options (the ⋯ header button) ───────────────────── */
  const renameThread = async () => {
    const title = renameText.trim();
    if (!title) return;
    setThreadTitle(title);
    setRenaming(false);
    setOptionsOpen(false);
    await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const clearMessages = async () => {
    setOptionsOpen(false);
    setMessages([]);
    await fetch(`/api/threads/${threadId}?messages=1`, { method: "DELETE" });
    setVoiceNote("Conversation cleared — the chat stays, the history is gone.");
    setTimeout(() => setVoiceNote(null), 5000);
  };

  const deleteThread = async () => {
    setOptionsOpen(false);
    await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
    router.push("/chats");
  };

  const fileContent = (name: string) =>
    dbFiles[name] ??
    MEMORY_FILES.find((f) => f.name === name)?.content ??
    "";

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
            <OrethaMark size={52} />
            <span className="rounded-full bg-elevated px-3.5 py-1.5 text-center">
              <span className="block font-display text-[13px] font-bold leading-tight text-cream">
              {threadTitle ?? agentName}
            </span>
            <span className="block text-[11.5px] leading-tight text-sand">
              {busy ? "is working" : "is ready"}
            </span>
          </span>
          </div>
          <button
            aria-label="Chat options"
            aria-expanded={optionsOpen}
            onClick={() => setOptionsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-cream transition active:scale-90"
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
            {loaded && messages.length === 0 && streaming === null && (
              <div className="flex flex-col items-center gap-2 pt-10 text-center">
                <Sparkles size={26} className="text-gold" />
                <p className="font-display text-[15px] font-bold text-cream">
                  {agentName} is listening
                </p>
                <p className="max-w-[260px] text-[12.5px] text-clay">
                  She knows your files, your rules, and your memory. What do you
                  need?
                </p>
              </div>
            )}
            {!loaded && messages.length === 0 && (
              <p className="pt-10 text-center text-[13px] text-clay">
                Loading the conversation…
              </p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {streaming !== null && streaming !== "" && (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "oretha",
                  text: streaming,
                  time: "Now",
                }}
              />
            )}
            {busy && streaming === "" && <TypingDots />}
            {seg === "activity" && null}
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
              The files that make {agentName} yours. She reads all five before
              every reply — and updates her memory as she learns you.
            </p>
            {["IDENTITY.md", "SOUL.md", "USER.md", "RULES.md", "MEMORY.md"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFileOpen(f)}
                  className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet/20 text-[#c4b5fd]">
                    <FileText size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-mono text-[14px] font-semibold text-cream">
                      {f}
                    </span>
                    <span className="block text-[12px] text-clay">
                      {f === "MEMORY.md"
                        ? "Auto-updated as you talk"
                        : f === "USER.md"
                          ? "What she knows about you"
                          : f === "RULES.md"
                            ? "The boundaries she lives by"
                            : f === "SOUL.md"
                              ? "Her voice and character"
                              : "Who she is"}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-clay" />
                </button>
              ),
            )}
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
        {llmReady === false && (
          <p className="mb-2 rounded-[12px] border border-gold/30 bg-gold/10 px-3 py-2 text-center text-[11.5px] leading-snug text-gold">
            No LLM key on the server yet — add <span className="font-mono">LLM_API_KEY</span> to go live.
          </p>
        )}
        {voiceNote && (
          <p className="mb-2 rounded-[12px] border border-violet/30 bg-violet/10 px-3 py-2 text-center text-[11.5px] leading-snug text-[#c4b5fd]">
            {voiceNote}
          </p>
        )}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-elevated py-1.5 pl-3 pr-1.5">
          <button
            aria-label="Quick actions"
            onClick={() => setPlusOpen(true)}
            className="text-sand transition active:scale-90"
          >
            <Plus size={20} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={listening ? "Listening…" : `Message ${agentName}…`}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-clay"
          />
          {input.trim() === "" && (
            <button
              aria-label={listening ? "Stop listening" : "Voice message"}
              aria-pressed={listening}
              onClick={toggleVoice}
              className={`px-1 transition active:scale-90 ${listening ? "animate-pulse text-gold" : "text-sand"}`}
            >
              <Mic size={20} />
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={busy ? stop : send}
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

      {/* Quick-actions sheet (the "+" button) */}
      <Sheet open={plusOpen} onClose={() => setPlusOpen(false)} title="Quick actions">
        <div className="flex flex-col gap-2.5 pb-4">
          <button
            onClick={() => {
              setPlusOpen(false);
              runMailSync();
            }}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
              {mailBusy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">Check the mailroom</span>
              <span className="block text-[12px] text-sand">Sync inbox now, triage new email to the board</span>
            </span>
          </button>

          <button
            onClick={() => {
              setPlusOpen(false);
              saveToMemory();
            }}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet/20 text-[#c4b5fd]">
              <NotebookPen size={18} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">Pin to her memory</span>
              <span className="block text-[12px] text-sand">Save the typed line into MEMORY.md permanently</span>
            </span>
          </button>

          <button
            onClick={() => {
              setPlusOpen(false);
              router.push("/office/board");
            }}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
              <KanbanSquare size={18} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">Open task board</span>
              <span className="block text-[12px] text-sand">See what the crew picked up from email</span>
            </span>
          </button>

          <button
            onClick={async () => {
              setPlusOpen(false);
              const r = await fetch("/api/threads", { method: "POST" });
              const d = await r.json().catch(() => null);
              if (d?.thread?.id) router.push(`/chats/${d.thread.id}`);
            }}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
              <SquarePlus size={18} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">New chat</span>
              <span className="block text-[12px] text-sand">Fresh thread, same memory</span>
            </span>
          </button>
        </div>
      </Sheet>

      {/* Chat options sheet (the ⋯ header button) */}
      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Chat options">
        <div className="flex flex-col gap-2.5 pb-4">
          {renaming ? (
            <div className="flex flex-col gap-2 rounded-[16px] border border-gold/30 bg-gold/5 p-4">
              <input
                autoFocus
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && renameThread()}
                placeholder="Chat name"
                className="w-full rounded-[12px] border border-white/10 bg-canvas p-3 text-[15px] text-cream outline-none placeholder:text-clay"
              />
              <div className="flex gap-2">
                <button
                  onClick={renameThread}
                  className="flex-1 rounded-[12px] bg-gradient-to-br from-gold to-violet py-2.5 text-[13.5px] font-bold text-canvas"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="flex-1 rounded-[12px] border border-white/10 py-2.5 text-[13.5px] font-semibold text-sand"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setRenameText(threadTitle ?? "");
                setRenaming(true);
              }}
              className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
                <Pencil size={18} />
              </span>
              <span>
                <span className="block text-[14.5px] font-semibold text-cream">Rename chat</span>
                <span className="block text-[12px] text-sand">Give this thread a name you'll find later</span>
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setSpeakReplies((s) => !s);
              setOptionsOpen(false);
            }}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${speakReplies ? "bg-gold/15 text-gold" : "bg-white/10 text-cream"}`}>
              {speakReplies ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </span>
            <span className="flex-1">
              <span className="block text-[14.5px] font-semibold text-cream">Speak replies aloud</span>
              <span className="block text-[12px] text-sand">Read her answers with the browser's voice</span>
            </span>
            <span className={`h-6 w-10 rounded-full p-0.5 transition ${speakReplies ? "bg-gold" : "bg-white/15"}`}>
              <span className={`block h-5 w-5 rounded-full bg-canvas transition ${speakReplies ? "translate-x-4" : ""}`} />
            </span>
          </button>

          <button
            onClick={clearMessages}
            className="flex items-center gap-3.5 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream">
              <Eraser size={18} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">Clear conversation</span>
              <span className="block text-[12px] text-sand">Wipe the history, keep the chat</span>
            </span>
          </button>

          <button
            onClick={deleteThread}
            className="flex items-center gap-3.5 rounded-[16px] border border-alert/30 bg-alert/10 p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-alert/20 text-alert">
              <Trash2 size={18} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-cream">Delete chat</span>
              <span className="block text-[12px] text-sand">Gone for good — thread and history</span>
            </span>
          </button>
        </div>
      </Sheet>

      <FileSheet
        open={fileOpen !== null}
        filename={fileOpen ?? ""}
        content={fileOpen ? fileContent(fileOpen) : ""}
        onClose={() => setFileOpen(null)}
        onSave={async (name, content) => {
          setDbFiles((f) => ({ ...f, [name]: content }));
          await fetch("/api/agent-files", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, content }),
          });
        }}
      />
    </main>
  );
}

function MessageBubble({ message }: { message: UiMessage }) {
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
