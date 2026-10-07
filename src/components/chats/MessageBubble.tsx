import { Chip } from "@/components/ui/Chip";
import type { ChatMessage } from "@/lib/types";

/** A message as the chat feed renders it (time already formatted for display). */
export interface UiMessage {
  id: string;
  role: ChatMessage["role"];
  text: string;
  time: string;
  toolLabel?: string;
}

export function MessageBubble({ message }: { message: UiMessage }) {
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
