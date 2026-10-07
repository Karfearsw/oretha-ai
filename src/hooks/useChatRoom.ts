"use client";

/* Chat-room page state extracted from
 * src/app/(mobile)/chats/[threadId]/page.tsx so the page keeps rendering,
 * streaming, and navigation while each concern lives in one place:
 *  - useFollowUpQueue → messages queued while the agent is replying
 *                       (chips above the composer, auto-fire on stream end)
 *  - useThreadDraft   → per-thread composer draft in sessionStorage
 *  - useAgentTaskCards → this thread's delegated-task plan cards
 * Rendering stays in the page; these hooks own only state + effects.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Follow-up queue: typed while busy, fired in order when the stream ends. */
export function useFollowUpQueue() {
  const [queue, setQueue] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  queueRef.current = queue;

  const enqueue = useCallback((text: string) => {
    setQueue((q) => [...q, text]);
  }, []);

  const unqueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
  }, []);

  /** Front of the queue (removed in the same step), or undefined. */
  const takeNext = useCallback((): string | undefined => {
    const next = queueRef.current[0];
    if (next !== undefined) setQueue((q) => q.slice(1));
    return next;
  }, []);

  return { queue, enqueue, unqueue, takeNext };
}

/**
 * Composer draft for one thread: restores saved text when the thread is
 * opened and persists every edit under `oretha-draft:<threadId>`, removing
 * the key when the composer empties.
 *
 * Call this AFTER any effect that seeds the composer (e.g. the page's
 * ?prompt deep-link prefill) so mount-time effect order stays:
 * prefill → load saved draft → persist.
 */
export function useThreadDraft(threadId: string) {
  const [input, setInput] = useState("");
  const draftKey = `oretha-draft:${threadId}`;
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) setInput(saved);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  useEffect(() => {
    try {
      if (input) sessionStorage.setItem(draftKey, input);
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* storage unavailable */
    }
  }, [input, draftKey]);
  return { input, setInput };
}

/**
 * This thread's delegated tasks (plan cards in the feed). Reloads when the
 * thread changes; the page refreshes after each stream ends in case the
 * reply created a task. Each AgentTaskCard polls its own status.
 */
export function useAgentTaskCards(threadId: string) {
  const [taskCards, setTaskCards] = useState<{ id: string; title: string }[]>([]);
  const loadTaskCards = useCallback(() => {
    fetch("/api/agent-tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const mine = (d?.tasks ?? []).filter(
          (t: { id: string; threadId: string | null; title: string }) =>
            t.threadId === threadId,
        );
        setTaskCards(
          mine.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })),
        );
      })
      .catch(() => {});
  }, [threadId]);
  useEffect(() => {
    loadTaskCards();
  }, [loadTaskCards]);
  return { taskCards, loadTaskCards };
}
