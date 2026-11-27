"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ForgeBuilder } from "@/components/forge/ForgeBuilder";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { EXAMPLE_PROMPTS, SIX_LESSONS } from "@/lib/promptForge";

export default function ForgePage() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [builderKey, setBuilderKey] = useState(0);
  const [activeExample, setActiveExample] = useState<number | null>(null);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const loadExample = (i: number) => {
    const ex = EXAMPLE_PROMPTS[i];
    setDraft(ex.text);
    setActiveExample(i);
    // Remount the builder so it picks up the new draft as its starting job.
    setBuilderKey((k) => k + 1);
  };

  const sendToChat = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/threads", { method: "POST" });
      const data = await res.json();
      if (data?.thread?.id) {
        router.push(`/chats/${data.thread.id}?prompt=${encodeURIComponent(text.trim())}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
          KSWBST · IN OTP WE TRUST · Flip • Stack • Win
        </p>
        <h1 className="mt-1 font-display text-[26px] font-bold text-cream">Prompt Forge</h1>
        <p className="mt-0.5 text-[13px] leading-snug text-sand">
          Rough ask in, strong brief out. Score it on the 4-part brief — job,
          why, guardrails, done — then forge it for any AI, a task, or a BMAD build.
        </p>
      </header>

      <ForgeBuilder
        key={builderKey}
        initialDraft={draft}
        onSendToChat={sendToChat}
      />

      {/* Real examples, audited scores */}
      <section aria-label="Real examples">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          Your own prompts, audited
        </h2>
        <p className="mb-2.5 text-[12.5px] leading-snug text-sand">
          Seven real prompts from Nov 27, 2026, scored on the 4-part brief.
          Tap one to load it into the Forge and see the upgrade.
        </p>
        <div className="flex flex-col gap-2.5">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => loadExample(i)}
              className={`rounded-[16px] border p-4 text-left transition active:scale-[0.99] ${
                activeExample === i
                  ? "border-gold/50 bg-gold/10"
                  : "border-white/8 bg-elevated"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold text-cream">{ex.label}</span>
                <Chip tone={ex.score >= 3 ? "gold" : "alert"}>{ex.score} / 10</Chip>
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-sand">
                “{ex.text}”
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-clay">{ex.why}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Six lessons cheat sheet */}
      <section aria-label="Six lessons">
        <button
          onClick={() => setLessonsOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-[16px] border border-white/8 bg-elevated p-4 text-left"
          aria-expanded={lessonsOpen}
        >
          <span className="font-display text-[16px] font-bold text-cream">
            The six lessons — cheat sheet
          </span>
          <ChevronDown
            size={18}
            className={`text-clay transition ${lessonsOpen ? "rotate-180" : ""}`}
          />
        </button>
        {lessonsOpen && (
          <div className="mt-2 flex flex-col gap-2">
            {SIX_LESSONS.map((l) => (
              <div key={l.title} className="rounded-[16px] border border-white/8 bg-elevated p-4">
                <p className="text-[14px] font-semibold text-cream">{l.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-sand">{l.line}</p>
              </div>
            ))}
            <p className="px-1 text-[12px] leading-snug text-clay">
              From Anthropic&apos;s study of ~400,000 Claude Code sessions: beginners reach a
              verified result 15% of the time; experts 28–33%. Experts get ~3,200 words
              back per message vs ~600 — and recover 4× as often when things go wrong.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLessonsOpen(false)}
            >
              Close cheat sheet
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
