"use client";

import { Bot, Plug } from "lucide-react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip, StatusDot } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import type { Agent } from "@/lib/types";

export function AgentDetailSheet({
  agent,
  onLaunch,
}: {
  agent: Agent;
  onLaunch: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-3">
        <AgentAvatar agentId={agent.id} name={agent.name} size={52} status={agent.status} />
        <div>
          <p className="font-display text-[17px] font-bold text-cream">
            {agent.role}
          </p>
          <p className="flex items-center gap-1.5 text-[12.5px] text-sand">
            <StatusDot
              tone={agent.status === "working" ? "running" : agent.status === "online" ? "complete" : "idle"}
              pulse={agent.status === "working"}
            />
            {agent.status === "working"
              ? "Working now"
              : agent.status === "online"
                ? "Online"
                : "Idle"}
          </p>
        </div>
      </div>

      <p className="text-[14px] leading-relaxed text-sand">{agent.description}</p>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-clay">
          <Bot size={13} /> Capabilities
        </p>
        <ul className="flex flex-col gap-1.5">
          {agent.capabilities.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[13.5px] text-cream">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-clay">
          <Plug size={13} /> Connectors
        </p>
        <div className="flex flex-wrap gap-2">
          {agent.connectors.map((c) => (
            <Chip key={c} tone="outline">
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-clay">
          Try asking
        </p>
        <div className="flex flex-col gap-2">
          {agent.examplePrompts.map((p) => (
            <button
              key={p}
              onClick={onLaunch}
              className="rounded-[14px] border border-white/10 bg-elevated px-3.5 py-2.5 text-left text-[13.5px] text-cream transition active:scale-[0.98]"
            >
              “{p}”
            </button>
          ))}
        </div>
      </div>

      <Button variant="gradient" size="lg" onClick={onLaunch}>
        Chat with {agent.name}
      </Button>
    </div>
  );
}
