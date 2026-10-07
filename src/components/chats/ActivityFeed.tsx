import { Sparkles } from "lucide-react";
import { AgentTaskCard } from "@/components/chats/AgentTaskCard";
import { MessageBubble } from "@/components/chats/MessageBubble";
import type { UiMessage } from "@/components/chats/MessageBubble";
import { TypingDots } from "@/components/chats/TypingDots";

/** The Activity segment: message feed, stream-in-progress, and plan cards. */
export function ActivityFeed({
  loaded,
  messages,
  streaming,
  busy,
  agentName,
  taskCards,
}: {
  loaded: boolean;
  messages: UiMessage[];
  streaming: string | null;
  busy: boolean;
  agentName: string;
  taskCards: Array<{ id: string }>;
}) {
  return (
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
      {taskCards.map((t) => (
        <AgentTaskCard key={t.id} taskId={t.id} />
      ))}
    </div>
  );
}
