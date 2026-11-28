"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Copy, Mic, Send } from "lucide-react";
import { ForgeBuilder } from "@/components/forge/ForgeBuilder";
import { InterviewFlow } from "@/components/forge/InterviewFlow";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { EXAMPLE_PROMPTS, SIX_LESSONS, KARPATHY_LESSON, SKILLS_LESSON, PERSONAL_AGENT_LESSON, DEPARTMENTS, buildSkillMarkdown, scorePrompt, type DepartmentStarter, type ForgeFields, type VisitorProfile } from "@/lib/promptForge";

/**
 * Prompt Forge page body — shared by the public /forge route (logged-out
 * visitors) and the signed-in in-app experience. The shell around it
 * (AppShell vs the public shell) is decided by src/app/forge/layout.tsx.
 *
 * `signedIn` means the visitor can send to chat: a session exists and setup
 * is complete. When false, "Send to chat" never fires — the gate below
 * points at /welcome instead, so it can never fail silently on a 401.
 */
export function ForgePage({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [builderKey, setBuilderKey] = useState(0);
  const [activeExample, setActiveExample] = useState<number | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewFields, setInterviewFields] = useState<ForgeFields | null>(null);
  /** About-you profile — four optional answers that tailor the Forge to the visitor. */
  const [profile, setProfile] = useState<VisitorProfile>({});
  const [sending, setSending] = useState(false);
  const [skillCopied, setSkillCopied] = useState(false);

  const activeDept = DEPARTMENTS.find((d) => d.id === activeDepartment) ?? null;

  const copySkill = async () => {
    if (!activeDept) return;
    const text = buildSkillMarkdown(activeDept);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setSkillCopied(true);
    window.setTimeout(() => setSkillCopied(false), 2000);
  };

  const loadExample = (i: number) => {
    const ex = EXAMPLE_PROMPTS[i];
    setDraft(ex.text);
    setActiveExample(i);
    setActiveDepartment(null);
    setInterviewFields(null);
    // Remount the builder so it picks up the new draft as its starting job.
    setBuilderKey((k) => k + 1);
  };

  /** Load one department's job-brief starter into the builder. */
  const loadDepartment = (dept: DepartmentStarter) => {
    setDraft(dept.starter.job);
    setInterviewFields(dept.starter);
    setActiveDepartment(dept.id);
    setActiveExample(null);
    // Remount the builder so it picks up the starter fields.
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
    <main className="flex flex-col gap-5 px-4 pt-2">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
          Free tool · No account needed
        </p>
        <h1 className="mt-1 font-display text-[26px] font-bold text-cream">Prompt Forge</h1>
        <p className="mt-0.5 text-[13px] leading-snug text-sand">
          Rough ask in, strong brief out. Score it on the 4-part brief — job,
          why, guardrails, done — then forge it for any AI, a task, or a BMAD build.
        </p>
      </header>

      {/* About you — four optional questions that tailor the Forge below. */}
      <section aria-label="About you">
        <div className="glass-card rounded-[16px] border border-gold/25 bg-elevated p-4">
          <p className="text-[14px] font-semibold text-cream">About you — optional</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-sand">
            Four quick answers and the Forge below shapes itself to your work —
            the examples, the placeholders, and the prompt it writes. Nothing
            leaves your browser.
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-sand">What do you do?</span>
              <input
                type="text"
                value={profile.work ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, work: e.target.value }))}
                placeholder="e.g. I run a bakery / I'm a realtor / I'm a student"
                className="w-full rounded-[12px] border border-white/10 bg-canvas px-3 py-2.5 text-[14px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-sand">What should your AI do for you?</span>
              <input
                type="text"
                value={profile.goal ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, goal: e.target.value }))}
                placeholder="e.g. Write my social posts / Draft my invoices"
                className="w-full rounded-[12px] border border-white/10 bg-canvas px-3 py-2.5 text-[14px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-sand">What's your biggest time-sink?</span>
              <input
                type="text"
                value={profile.timesink ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, timesink: e.target.value }))}
                placeholder="e.g. Answering the same customer questions"
                className="w-full rounded-[12px] border border-white/10 bg-canvas px-3 py-2.5 text-[14px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-sand">How do you work best?</span>
              <input
                type="text"
                value={profile.style ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, style: e.target.value }))}
                placeholder="e.g. Solo, early mornings, by voice"
                className="w-full rounded-[12px] border border-white/10 bg-canvas px-3 py-2.5 text-[14px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Interview mode — answer by typing or by voice, hear each question. */}
      <section aria-label="Interview me">
        {interviewOpen ? (
          <InterviewFlow
            onComplete={(result) => {
              setInterviewFields(result.fields);
              setProfile((p) => ({ ...p, ...result.profile }));
              setDraft(result.fields.job);
              setActiveExample(null);
              setInterviewOpen(false);
              // Remount the builder so it picks up the interview answers.
              setBuilderKey((k) => k + 1);
            }}
          />
        ) : (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setInterviewOpen(true)}
            className="w-full border-gold/30"
          >
            <Mic size={16} /> Interview me — answer out loud, I&apos;ll write the prompt
          </Button>
        )}
      </section>

      <ForgeBuilder
        key={builderKey}
        initialDraft={draft}
        initialFields={interviewFields ?? undefined}
        profile={profile}
        onSendToChat={signedIn ? sendToChat : undefined}
      />

      {/* Logged-out gate: never let "Send to chat" fail silently on a 401. */}
      {!signedIn && (
        <Link
          href="/welcome"
          className="inline-flex h-13 w-full select-none items-center justify-center gap-2 rounded-[16px] bg-gold px-6 font-display text-[16px] font-semibold text-canvas transition active:scale-[0.97]"
        >
          <Send size={16} /> Sign in to send this to your crew
        </Link>
      )}

      {/* Departments — a starter map for the visitor's business */}
      <section aria-label="Departments">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          Departments — a starter map for your business
        </h2>
        <p className="mb-2.5 text-[12.5px] leading-snug text-sand">
          Seven departments most small businesses need. Rename them to fit
          yours — the names are a starting point, not a rule. Pick one and a
          starter brief for that kind of work loads into the Forge above, plus
          the same job as a SKILL.md you can keep.
        </p>
        <div className="flex flex-col gap-2.5">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              onClick={() => loadDepartment(dept)}
              className={`glass-card rounded-[16px] border p-4 text-left transition active:scale-[0.99] ${
                activeDepartment === dept.id
                  ? "border-gold/50 bg-gold/10"
                  : "border-white/8 bg-elevated"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold text-cream">{dept.name}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-sand">{dept.tagline}</p>
              <p className="mt-1.5 text-[12px] leading-snug text-clay">
                Starter: {dept.starter.job}
              </p>
            </button>
          ))}
        </div>
        {activeDept && (
          <div className="mt-2.5 rounded-[16px] border border-gold/25 bg-elevated p-4">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-gold">
              Department skill — SKILL.md
            </p>
            <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-cream">
              {buildSkillMarkdown(activeDept)}
            </pre>
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={copySkill}>
                {skillCopied ? <Check size={16} /> : <Copy size={16} />}
                {skillCopied ? "Skill copied" : "Copy skill"}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Example prompts, scored live — made-up examples, not real people */}
      <section aria-label="Example prompts">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          Example prompts, scored
        </h2>
        <p className="mb-2.5 text-[12.5px] leading-snug text-sand">
          Made-up examples from different kinds of people — not real prompts
          from anyone. Each score is the scorer&apos;s live verdict on the text.
          Tap one to load it into the Forge and see the upgrade.
        </p>
        <div className="flex flex-col gap-2.5">
          {EXAMPLE_PROMPTS.map((ex, i) => {
            const liveScore = scorePrompt(ex.text).total;
            return (
              <button
                key={i}
                onClick={() => loadExample(i)}
                className={`glass-card rounded-[16px] border p-4 text-left transition active:scale-[0.99] ${
                  activeExample === i
                    ? "border-gold/50 bg-gold/10"
                    : "border-white/8 bg-elevated"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-cream">{ex.label}</span>
                  <Chip tone={liveScore >= 3 ? "gold" : "alert"}>{liveScore} / 10</Chip>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-sand">
                  “{ex.text}”
                </p>
                <p className="mt-1.5 text-[12px] leading-snug text-clay">{ex.why}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lessons cheat sheet — six Anthropic lessons + Karpathy + skills + personal agent */}
      <section aria-label="Lessons">
        <button
          onClick={() => setLessonsOpen((o) => !o)}
          className="glass-card flex w-full items-center justify-between rounded-[16px] border border-white/8 bg-elevated p-4 text-left"
          aria-expanded={lessonsOpen}
        >
          <span className="font-display text-[16px] font-bold text-cream">
            The lessons — cheat sheet
          </span>
          <ChevronDown
            size={18}
            className={`text-clay transition ${lessonsOpen ? "rotate-180" : ""}`}
          />
        </button>
        {lessonsOpen && (
          <div className="mt-2 flex flex-col gap-2">
            {SIX_LESSONS.map((l) => (
              <div key={l.title} className="glass-card rounded-[16px] border border-white/8 bg-elevated p-4">
                <p className="text-[14px] font-semibold text-cream">{l.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-sand">{l.line}</p>
              </div>
            ))}
            <div className="rounded-[16px] border border-gold/25 bg-elevated p-4">
              <p className="text-[14px] font-semibold text-cream">{KARPATHY_LESSON.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-sand">{KARPATHY_LESSON.intro}</p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {KARPATHY_LESSON.principles.map((p, i) => (
                  <div key={p.title}>
                    <p className="text-[13px] font-semibold text-cream">
                      {i + 1}. {p.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-sand">{p.line}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11.5px] leading-snug text-clay">
                {KARPATHY_LESSON.sources}
              </p>
            </div>
            <div className="rounded-[16px] border border-gold/25 bg-elevated p-4">
              <p className="text-[14px] font-semibold text-cream">{SKILLS_LESSON.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-sand">{SKILLS_LESSON.intro}</p>
              <p className="mt-2 text-[12.5px] leading-snug text-sand">{SKILLS_LESSON.analogy}</p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {SKILLS_LESSON.levels.map((lv) => (
                  <div key={lv.level}>
                    <p className="text-[13px] font-semibold text-cream">
                      {lv.level} — {lv.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-sand">{lv.line}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {SKILLS_LESSON.rules.map((r) => (
                  <p key={r} className="text-[12.5px] leading-snug text-sand">
                    • {r}
                  </p>
                ))}
              </div>
              <p className="mt-2.5 text-[11.5px] leading-snug text-clay">
                {SKILLS_LESSON.sources}
              </p>
            </div>
            <div className="rounded-[16px] border border-gold/25 bg-elevated p-4">
              <p className="text-[14px] font-semibold text-cream">{PERSONAL_AGENT_LESSON.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-sand">{PERSONAL_AGENT_LESSON.intro}</p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {PERSONAL_AGENT_LESSON.act.map((a) => (
                  <div key={a.letter}>
                    <p className="text-[13px] font-semibold text-cream">
                      {a.letter} — {a.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-sand">{a.line}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[12.5px] leading-snug text-sand">
                <span className="font-semibold text-cream">The rule: </span>
                {PERSONAL_AGENT_LESSON.rule}
              </p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {PERSONAL_AGENT_LESSON.forces.map((f) => (
                  <div key={f.title}>
                    <p className="text-[13px] font-semibold text-cream">{f.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-sand">{f.line}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11.5px] leading-snug text-clay">
                {PERSONAL_AGENT_LESSON.sources}
              </p>
            </div>
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
