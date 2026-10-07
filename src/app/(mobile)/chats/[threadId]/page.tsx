"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileSheet } from "@/components/ui/FileSheet";
import { ChatHeader, type Seg } from "@/components/chats/ChatHeader";
import { ActivityFeed } from "@/components/chats/ActivityFeed";
import {
  GuardrailsPanel,
  MemoryPanel,
  FilesPanel,
} from "@/components/chats/ChatPanels";
import { ChatComposer } from "@/components/chats/ChatComposer";
import { QuickActionsSheet } from "@/components/chats/QuickActionsSheet";
import { ThreadOptionsSheet } from "@/components/chats/ThreadOptionsSheet";
import type { UiMessage } from "@/components/chats/MessageBubble";
import { generateAgentFiles } from "@/lib/agentFiles";
import { useSessionUser } from "@/components/layout/AppShell";
import {
  useFollowUpQueue,
  useThreadDraft,
  useAgentTaskCards,
} from "@/hooks/useChatRoom";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { clockLabel } from "@/lib/time";

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
  const [mailBusy, setMailBusy] = useState(false);
  /* Follow-up queue: messages typed while the agent is replying. They show
   * as chips above the composer and fire automatically when the stream ends.
   * State lives in useFollowUpQueue. */
  const { queue, enqueue, unqueue, takeNext } = useFollowUpQueue();
  /* Delegated tasks created in this thread (plan cards in the feed). */
  const { taskCards, loadTaskCards } = useAgentTaskCards(threadId);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
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

  // Draft retention: keep unsent text across re-renders and navigation.
  // Declared AFTER the deep-link prefill effect above so mount-time effect
  // order stays: prefill → load saved draft → persist.
  const { input, setInput } = useThreadDraft(threadId);
  // Voice input owns its recognition ref + toast line; no mount effects.
  const { listening, voiceNote, setVoiceNote, toggleVoice } =
    useVoiceInput(setInput);

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
              time: clockLabel(new Date(m.createdAt)),
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
          time: clockLabel(),
        },
      ]);
    }
    setStreaming(null);
    setBusy(false);
    // Draft + follow-up queue both survive a stop.
  };

  /* Fire one message at the model. The follow-up queue chains through the
   * `finally` below: when a stream ends, the next queued message goes out. */
  const fire = (text: string) => {
    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: "user", text, time: clockLabel() },
    ]);
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
                time: clockLabel(),
              },
            ]);
            if (speakRepliesRef.current) speakAloud(current);
          }
          return null;
        });
        // Follow-up queue: fire the next message the agent finished.
        const next = takeNext();
        if (next !== undefined) {
          // Let React flush the assistant bubble before the next turn starts.
          setTimeout(() => fire(next), 50);
        } else {
          loadTaskCards(); // refresh plan cards in case one was created
        }
      });
  };

  /* One entry point: while the agent is replying, sends queue up (visible
   * chips above the composer); otherwise they fire immediately. */
  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput(""); // clears the draft too — it's on its way now
    if (busy) {
      enqueue(text);
      return;
    }
    fire(text);
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

  const startRename = () => {
    setRenameText(threadTitle ?? "");
    setRenaming(true);
  };

  const toggleSpeakReplies = () => {
    setSpeakReplies((s) => !s);
    setOptionsOpen(false);
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

  const newChatThread = async () => {
    const r = await fetch("/api/threads", { method: "POST" });
    const d = await r.json().catch(() => null);
    if (d?.thread?.id) router.push(`/chats/${d.thread.id}`);
  };

  const fileContent = (name: string) =>
    dbFiles[name] ??
    MEMORY_FILES.find((f) => f.name === name)?.content ??
    "";

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ChatHeader
        threadTitle={threadTitle}
        agentName={agentName}
        busy={busy}
        seg={seg}
        onSegChange={setSeg}
        optionsOpen={optionsOpen}
        onOpenOptions={() => setOptionsOpen(true)}
      />

      {/* Body */}
      <div ref={listRef} className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
        {seg === "activity" && (
          <ActivityFeed
            loaded={loaded}
            messages={messages}
            streaming={streaming}
            busy={busy}
            agentName={agentName}
            taskCards={taskCards}
          />
        )}

        {seg === "guardrails" && <GuardrailsPanel />}

        {seg === "memory" && (
          <MemoryPanel agentName={agentName} onOpenFile={setFileOpen} />
        )}

        {seg === "files" && <FilesPanel />}
      </div>

      <ChatComposer
        llmReady={llmReady}
        note={voiceNote}
        queue={queue}
        onUnqueue={unqueue}
        listening={listening}
        busy={busy}
        agentName={agentName}
        input={input}
        onInputChange={setInput}
        onSend={send}
        onStop={stop}
        onToggleVoice={toggleVoice}
        onOpenQuickActions={() => setPlusOpen(true)}
      />

      <QuickActionsSheet
        open={plusOpen}
        onClose={() => setPlusOpen(false)}
        mailBusy={mailBusy}
        onCheckMail={runMailSync}
        onPinToMemory={saveToMemory}
        onOpenBoard={() => router.push("/office/board")}
        onNewChat={newChatThread}
      />

      <ThreadOptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        renaming={renaming}
        renameText={renameText}
        onRenameTextChange={setRenameText}
        onStartRename={startRename}
        onSaveRename={renameThread}
        onCancelRename={() => setRenaming(false)}
        speakReplies={speakReplies}
        onToggleSpeakReplies={toggleSpeakReplies}
        onClear={clearMessages}
        onDelete={deleteThread}
      />

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
