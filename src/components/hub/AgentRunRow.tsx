"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, CircleDashed, ChevronDown } from "lucide-react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { agentById } from "@/lib/mock/agents";
import type { AgentRun } from "@/lib/types";

export function AgentRunRow({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false);
  const agent = agentById(run.agentId);

  return (
    <div className="overflow-hidden rounded-[16px] border border-white/8 bg-elevated">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-3.5 text-left transition active:bg-white/4"
        aria-expanded={expanded}
      >
        {agent && (
          <AgentAvatar
            agentId={agent.id}
            name={agent.name}
            size={44}
            status={agent.status}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15px] font-bold text-cream">
            {run.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-sand">
            {run.status === "running" ? (
              <span className="anim-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            ) : (
              <CheckCircle2 size={12} className="text-complete" />
            )}
            {agent?.name} {run.status === "running" ? "is working" : "finished"} ·{" "}
            {run.time}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-clay transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="border-t border-white/8 px-4 py-3">
              <Chip tone={run.status === "running" ? "gold" : "complete"}>
                {run.status === "running" ? "In progress" : "Complete"}
              </Chip>
              <p className="mt-2 text-[13px] leading-snug text-sand">
                {run.summary}
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {run.steps.map((step) => (
                  <div key={step.label} className="flex items-start gap-2.5">
                    {step.status === "complete" ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-complete" />
                    ) : (
                      <CircleDashed size={16} className="mt-0.5 shrink-0 text-gold" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-cream">
                        {step.label}
                      </p>
                      <p className="text-[12px] text-clay">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
