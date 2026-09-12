"use client";

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
import { AgentRunRow } from "@/components/hub/AgentRunRow";
import { useSessionUser } from "@/components/layout/AppShell";
import { PULSE_METRICS } from "@/lib/mock/office";
import { RUNS } from "@/lib/mock/threads";

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
    href: "/office/board",
  },
  {
    title: "Media Lab",
    desc: "Images, video, music, social packs.",
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
  const running = RUNS.filter((r) => r.status === "running").length;
  const firstName = (user?.name ?? "").split(" ")[0];

  return (
    <main className="pad-safe-top flex flex-col gap-6 px-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-display text-[22px] font-bold text-cream">
            {firstName ? `Evening, ${firstName}.` : "Evening."}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-sand">
            <span className="anim-pulse-dot inline-block h-2 w-2 rounded-full bg-gold" />
            {running} agents working
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet font-display text-[16px] font-bold text-canvas">
          {user?.avatarSeed || firstName?.charAt(0).toUpperCase() || "O"}
        </span>
      </header>

      <HeroBanner />

      <section aria-label="Today's pulse">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-cream">
            Today&apos;s Pulse
          </h2>
          <span className="text-[12px] font-medium text-clay">from KEVO</span>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {PULSE_METRICS.map((m) => (
            <PulseMetricCard key={m.id} metric={m} />
          ))}
        </div>
      </section>

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
          <span className="text-[12px] font-medium text-clay">
            tap for details
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {RUNS.map((run) => (
            <AgentRunRow key={run.id} run={run} />
          ))}
        </div>
      </section>

      <p className="pb-2 text-center text-[11.5px] text-clay">
        Built for us. Uncensored by design.
      </p>
    </main>
  );
}
