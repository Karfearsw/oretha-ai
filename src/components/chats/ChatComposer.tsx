import { motion } from "framer-motion";
import { X, Plus, Mic, ArrowUp, Square } from "lucide-react";

/** Sticky composer: banners, follow-up queue chips, input row + send/stop. */
export function ChatComposer({
  llmReady,
  note,
  queue,
  onUnqueue,
  listening,
  busy,
  agentName,
  input,
  onInputChange,
  onSend,
  onStop,
  onToggleVoice,
  onOpenQuickActions,
}: {
  llmReady: boolean | null;
  /** Toast line under the composer (voice / mail / pin feedback). */
  note: string | null;
  queue: string[];
  onUnqueue: (index: number) => void;
  listening: boolean;
  busy: boolean;
  agentName: string;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onToggleVoice: () => void;
  onOpenQuickActions: () => void;
}) {
  return (
    <div
      className="sticky bottom-0 z-20 bg-gradient-to-t from-canvas via-canvas to-transparent px-4 pb-4 pt-2"
      style={{ paddingBottom: "calc(16px + var(--safe-bottom))" }}
    >
      {llmReady === false && (
        <p className="mb-2 rounded-[12px] border border-gold/30 bg-gold/10 px-3 py-2 text-center text-[11.5px] leading-snug text-gold">
          No LLM key on the server yet — add <span className="font-mono">LLM_API_KEY</span> to go live.
        </p>
      )}
      {note && (
        <p className="mb-2 rounded-[12px] border border-violet/30 bg-violet/10 px-3 py-2 text-center text-[11.5px] leading-snug text-[#c4b5fd]">
          {note}
        </p>
      )}
      {queue.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          <p className="px-1 text-[11px] font-medium uppercase tracking-widest text-clay">
            {queue.length} queued {queue.length === 1 ? "follow-up" : "follow-ups"}
          </p>
          {queue.map((q, i) => (
            <div
              key={`${i}-${q.slice(0, 24)}`}
              className="flex items-center gap-2 rounded-[12px] border border-white/8 bg-elevated px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-sand">
                {q}
              </span>
              <button
                onClick={() => onUnqueue(i)}
                aria-label="Remove from queue"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-clay transition active:scale-90 hover:text-alert"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-elevated py-1.5 pl-3 pr-1.5">
        <button
          aria-label="Quick actions"
          onClick={onOpenQuickActions}
          className="text-sand transition active:scale-90"
        >
          <Plus size={20} />
        </button>
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder={
            listening
              ? "Listening…"
              : busy
                ? `${agentName} is replying — Enter queues a follow-up…`
                : `Message ${agentName}…`
          }
          className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-clay"
        />
        {input.trim() === "" && (
          <button
            aria-label={listening ? "Stop listening" : "Voice message"}
            aria-pressed={listening}
            onClick={onToggleVoice}
            className={`px-1 transition active:scale-90 ${listening ? "animate-pulse text-gold" : "text-sand"}`}
          >
            <Mic size={20} />
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={busy ? onStop : onSend}
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
  );
}
