"use client";

import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { PulseMetricCard } from "@/components/hub/PulseMetricCard";
import { TrendChart } from "@/components/ui/charts";
import { AgentAvatar } from "@/components/ui/Avatar";
import { PULSE_METRICS, PULSE_NOTES } from "@/lib/mock/office";
import { agentById } from "@/lib/mock/agents";

const TREND = [12, 18, 9, 22, 16, 25, 19, 28, 24, 31, 27, 35, 30, 38];

export default function PulsePage() {
  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          Company Pulse
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Week 36 · the floor at a glance.
        </p>
      </header>

      <OfficeSubTabs />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3">
        {PULSE_METRICS.map((m) => (
          <PulseMetricCard key={m.id} metric={m} />
        ))}
      </section>

      <section aria-label="Trend">
        <div className="rounded-[18px] border border-white/8 bg-elevated p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-bold text-cream">
              Output trend · 14 days
            </h2>
            <span className="text-[11px] font-semibold text-complete">+24%</span>
          </div>
          <TrendChart data={TREND} />
          <div className="mt-1 flex justify-between text-[10.5px] text-clay">
            <span>Aug 30</span>
            <span>Sep 12</span>
          </div>
        </div>
      </section>

      <section aria-label="Agent notes">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          From your agents
        </h2>
        <div className="flex flex-col gap-2.5">
          {PULSE_NOTES.map((n) => {
            const agent = agentById(n.agentId);
            return (
              <div
                key={n.id}
                className="flex gap-3 rounded-[16px] border border-white/8 bg-elevated p-4"
              >
                {agent && (
                  <AgentAvatar agentId={agent.id} name={agent.name} size={36} />
                )}
                <div className="min-w-0">
                  <p className="text-[13.5px] leading-relaxed text-cream">
                    {n.text}
                  </p>
                  <p className="mt-1 text-[11px] text-clay">
                    {agent?.name} · {n.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
