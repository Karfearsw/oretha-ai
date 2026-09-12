"use client";

import { useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { OfficeSubTabs } from "@/components/office/OfficeSubTabs";
import { EMPLOYEES } from "@/lib/mock/office";
import type { Department, Employee } from "@/lib/types";

const DEPTS: ("All" | Department)[] = [
  "All",
  "Engineering",
  "Marketing",
  "Real Estate",
  "Media",
  "Ops",
];

export default function DirectoryPage() {
  const [dept, setDept] = useState<(typeof DEPTS)[number]>("All");
  const [selected, setSelected] = useState<Employee | null>(null);

  const staff = dept === "All" ? EMPLOYEES : EMPLOYEES.filter((e) => e.department === dept);

  return (
    <main className="pad-safe-top flex flex-col px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          AI Employee Directory
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Your virtual staff. Assign work like you&apos;d brief a team.
        </p>
      </header>

      <div className="mt-3">
        <OfficeSubTabs />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {DEPTS.map((d) => (
          <button key={d} onClick={() => setDept(d)}>
            <Chip tone={dept === d ? "gold" : "outline"}>{d}</Chip>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {staff.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e)}
            className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-3.5 text-left transition active:scale-[0.98]"
          >
            <AgentAvatar agentId={e.id} name={e.name} size={46} status={e.status} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[15px] font-bold text-cream">
                {e.name} — {e.title}
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-sand">
                {e.capabilities}
              </span>
            </span>
            <Chip tone={e.status === "working" ? "gold" : e.status === "online" ? "complete" : "neutral"}>
              {e.status === "working" ? "Working" : e.status === "online" ? "Online" : "Idle"}
            </Chip>
          </button>
        ))}
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} · ${selected.title}` : ""}
      >
        {selected && (
          <div className="flex flex-col gap-4 pb-4">
            <p className="text-[14px] leading-relaxed text-sand">
              {selected.capabilities}
            </p>

            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-clay">
                Skill matrix
              </p>
              <div className="flex flex-col gap-2.5">
                {selected.skills.map((s) => (
                  <div key={s.name}>
                    <div className="mb-1 flex justify-between text-[12.5px]">
                      <span className="text-cream">{s.name}</span>
                      <span className="text-clay">{s.level}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-violet"
                        style={{ width: `${s.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-clay">
                Sample tasks
              </p>
              <div className="flex flex-col gap-2">
                {selected.sampleTasks.map((t) => (
                  <div
                    key={t}
                    className="rounded-[12px] border border-white/8 bg-elevated px-3.5 py-2.5 text-[13.5px] text-cream"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <Button variant="gradient" size="lg" onClick={() => setSelected(null)}>
              Assign a task to {selected.name}
            </Button>
          </div>
        )}
      </Sheet>
    </main>
  );
}
