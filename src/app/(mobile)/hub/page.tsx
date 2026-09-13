"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessagesSquare,
  Building2,
  Workflow,
  Wand2,
  BookOpen,
} from "lucide-react";
import { HeroBanner } from "@/components/hub/HeroBanner";
import { FeatureCard } from "@/components/hub/FeatureCard";
import { PulseMetricCard } from "@/components/hub/PulseMetricCard";
import {
  WorkflowRunCard,
  type RunFeedItem,
} from "@/components/hub/WorkflowRunCard";
import { useSessionUser } from "@/components/layout/AppShell";
import type { PulseMetric } from "@/lib/types";

const FEATURES = [
  {
    title: "Chats & Agents",
    desc: "Talk it out or put an agent on it.",
    icon: MessagesSquare,
    href: "/chats",
  },
  {
    title: "KEVO Office",
    desc: "Your virtual office control room.",
    icon: Building2,
    href: "/office",
  },
  {
    title: "Workflows",
    desc: "Automations that run while you sleep.",
    icon: Workflow,
    href: "/workflows",
  },
  {
    title: "Media Lab",
    desc: "Creative studio with your agent.",
    icon: Wand2,
    href: "/media",
  },
  {
    title: "Guides & Playbooks",
    desc: "Runbooks for real estate, recon, and content sprints.",
    icon: BookOpen,
    href: "/guides",
    full: true,
  },
];

export default function HubPage() {
  const user = useSessionUser();
  const [runs, setRuns] = useState<RunFeedItem[]>([]);
  const [metrics, setMetrics] = useState<PulseMetric[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/runs/recent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.runs && setRuns(d.runs))
      .catch(() => {});
    fetch("/api/pulse")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.metrics && setMetrics(d.metrics))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const running = runs.filter((r) => r.status === "running").length;
  const firstName = (user?.name ?? "").split(" ")[0];

  return (
    <main className="pad-safe-top flex flex-col gap-6 px-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-display text-[22px] font-bold text-cream">
            {firstName ? `Evening, ${firstName}.` : "Evening."}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-sand">
            {running > 0 && (
              <span className="anim-pulse-dot inline-block h-2 w-2 rounded-full bg-gold" />
            )}
            {running > 0 ? `${running} workflow${running === 1 ? "" : "s"} running` : "All quiet on the floor"}
          </p>
        </div>
        <Link
          href="/profile"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet font-display text-[16px] font-bold text-canvas"
        >
          {user?.avatarSeed || firstName?.charAt(0).toUpperCase() || "O"}
        </Link>
      </header>

      <HeroBanner />

      {metrics.length > 0 && (
        <section aria-label="Today's pulse">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-bold text-cream">
              Today&apos;s Pulse
            </h2>
            <Link href="/office/pulse" className="text-[12px] font-medium text-gold">
              Full pulse
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {metrics.map((m) => (
              <PulseMetricCard key={m.id} metric={m} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Features">
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className={f.full ? "col-span-2" : ""}
            >
              <FeatureCard {...f} />
            </motion.div>
          ))}
        </div>
      </section>

      <section aria-label="Active runs">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-cream">
            On it right now
          </h2>
          <Link href="/workflows" className="text-[12px] font-medium text-gold">
            All workflows
          </Link>
        </div>
        {runs.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/10 p-6 text-center">
            <p className="text-[13px] leading-snug text-sand">
              Nothing on the floor yet. Set a workflow and your agents clock in
              on their own.
            </p>
            <Link
              href="/workflows"
              className="mt-3 inline-block rounded-full bg-gold/12 px-4 py-2 text-[12.5px] font-semibold text-gold"
            >
              Create a workflow
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {runs.map((run) => (
              <WorkflowRunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>

      <p className="pb-2 text-center text-[11.5px] text-clay">
        Built for us. Uncensored by design.
      </p>
    </main>
  );
}
