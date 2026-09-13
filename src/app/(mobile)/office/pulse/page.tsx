"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { PulseMetricCard } from "@/components/hub/PulseMetricCard";
import { TrendChart } from "@/components/ui/charts";
import { AgentAvatar } from "@/components/ui/Avatar";
import type { PulseMetric } from "@/lib/types";

interface PulseNote {
  agent: string;
  text: string;
}

interface PulseData {
  metrics: PulseMetric[];
  trend: number[];
  trendDelta: number;
  notes: PulseNote[];
  completedTasks: number;
  failedRuns: number;
}

const NOTE_TONE: Record<string, string> = {
  Ops: "bg-gold",
  Engineering: "bg-violet",
  Mailroom: "bg-[#38bdf8]",
  Media: "bg-pink-400",
};

export default function PulsePage() {
  const [data, setData] = useState<PulseData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/pulse")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const start = new Date(Date.now() - 13 * 86_400_000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          Company Pulse
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Your real numbers, last 14 days.
        </p>
      </header>

      <OfficeSubTabs />

      {!data ? (
        <p className="py-10 text-center text-[13px] text-clay">
          Counting the floor…
        </p>
      ) : (
        <>
          <section aria-label="Key metrics" className="grid grid-cols-2 gap-3">
            {data.metrics.map((m) => (
              <PulseMetricCard key={m.id} metric={m} />
            ))}
          </section>

          <section aria-label="Trend">
            <div className="rounded-[18px] border border-white/8 bg-elevated p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-[15px] font-bold text-cream">
                  Output trend · 14 days
                </h2>
                <span
                  className={`text-[11px] font-semibold ${data.trendDelta >= 0 ? "text-complete" : "text-alert"}`}
                >
                  {data.trendDelta >= 0 ? "+" : ""}
                  {data.trendDelta}%
                </span>
              </div>
              <TrendChart data={data.trend.length ? data.trend : [0, 0]} />
              <div className="mt-1 flex justify-between text-[10.5px] text-clay">
                <span>{start}</span>
                <span>{end}</span>
              </div>
            </div>
          </section>

          <section aria-label="Agent notes">
            <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
              From your agents
            </h2>
            {data.notes.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-white/10 p-5 text-center text-[12.5px] leading-snug text-clay">
                Agents chime in once there&apos;s activity to report. Chat,
                triage mail, or run a workflow — then check back.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {data.notes.map((n, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-[16px] border border-white/8 bg-elevated p-4"
                  >
                    <span
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-canvas ${NOTE_TONE[n.agent] ?? "bg-sand"}`}
                    >
                      {n.agent.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-relaxed text-cream">
                        {n.text}
                      </p>
                      <p className="mt-1 text-[11px] text-clay">
                        {n.agent} · just now
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {(data.failedRuns > 0 || data.completedTasks > 0) && (
            <p className="pb-2 text-center text-[11.5px] text-clay">
              {data.completedTasks} task{data.completedTasks === 1 ? "" : "s"} done
              {data.failedRuns > 0 && ` · ${data.failedRuns} run${data.failedRuns === 1 ? "" : "s"} need attention`}
              {" · "}
              <Link href="/workflows" className="underline decoration-white/20">
                review workflows
              </Link>
            </p>
          )}
        </>
      )}
    </main>
  );
}
