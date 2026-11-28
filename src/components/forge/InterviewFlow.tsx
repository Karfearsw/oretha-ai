"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/forge/VoiceInput";
import {
  listVoices,
  speak,
  stopSpeaking,
  speechSynthesisSupported,
} from "@/lib/voice";
import type { ForgeFields, VisitorProfile } from "@/lib/promptForge";

interface Step {
  /** Profile steps come first and tailor the Forge; field steps build the brief. */
  section: "profile" | "fields";
  key: keyof VisitorProfile | keyof ForgeFields;
  question: string;
  hint: string;
  placeholder: string;
  optional?: boolean;
}

/**
 * About you — four quick, optional questions up front. The answers tailor
 * the Forge to the visitor (their work, their goal, their time-sink, how
 * they work) and become the Context line of the forged prompt. All four
 * are skippable; nothing is assumed about the visitor.
 */
const PROFILE_STEPS: Step[] = [
  {
    section: "profile",
    key: "work",
    question: "What do you do? Your job, business, or role.",
    hint: "So the examples and the prompt read like they're for you.",
    placeholder: "e.g. I run a bakery / I'm a realtor / I'm a student…",
    optional: true,
  },
  {
    section: "profile",
    key: "goal",
    question: "What do you want the AI to do for you?",
    hint: "The one job you'd hand off first.",
    placeholder: "e.g. Write my social posts / Draft my invoices…",
    optional: true,
  },
  {
    section: "profile",
    key: "timesink",
    question: "What's your biggest time-sink?",
    hint: "The chore that eats your week.",
    placeholder: "e.g. Answering the same customer questions…",
    optional: true,
  },
  {
    section: "profile",
    key: "style",
    question: "How do you work best?",
    hint: "Solo or with a team, mornings or nights, by voice or by typing.",
    placeholder: "e.g. Solo, early mornings, by voice…",
    optional: true,
  },
];

const FIELD_STEPS: Step[] = [
  {
    section: "fields",
    key: "job",
    question: "What do you want the AI to do? Say the whole job in one sentence.",
    hint: "The whole task — not one step. Decide what gets done; let the AI figure out how.",
    placeholder: "e.g. Draft a follow-up email for the clients who asked about pricing last week…",
  },
  {
    section: "fields",
    key: "why",
    question: "Why do you want it? What will it let you do or decide?",
    hint: "The reason lets the AI make the small calls the way you would.",
    placeholder: "e.g. So nobody waits more than a day for an answer…",
  },
  {
    section: "fields",
    key: "guardrails",
    question: "What should it NOT do, touch, or invent?",
    hint: "Only the guardrails that really matter — with a reason if you have one.",
    placeholder: "e.g. Don't invent prices or dates — use only the facts I give you…",
    optional: true,
  },
  {
    section: "fields",
    key: "done",
    question: "How will you know it's done? Name one check it must pass.",
    hint: "If you never define done, the AI stops when it thinks it's done — which is a guess.",
    placeholder: "e.g. Every draft names the next step and who does it…",
  },
  {
    section: "fields",
    key: "role",
    question: "Who should it act as? You can skip this one.",
    hint: "A role helps on bigger jobs — an assistant, an editor, a researcher.",
    placeholder: "e.g. my assistant",
    optional: true,
  },
  {
    section: "fields",
    key: "deadline",
    question: "When is it due? You can skip this one too.",
    hint: "A deadline keeps a long job honest.",
    placeholder: "e.g. Friday",
    optional: true,
  },
];

const STEPS: Step[] = [...PROFILE_STEPS, ...FIELD_STEPS];

/**
 * "Interview me" flow: four About-you questions first (all skippable),
 * then one question at a time until the four parts of a strong brief are
 * clear. Hands the filled fields plus the visitor's profile to the
 * builder. Answers can be spoken (mic) and questions can be heard
 * (speaker).
 */
export function InterviewFlow({
  onComplete,
}: {
  onComplete: (result: { fields: ForgeFields; profile: VisitorProfile }) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ForgeFields>({
    job: "",
    why: "",
    guardrails: "",
    done: "",
    role: "",
    deadline: "",
  });
  const [profile, setProfile] = useState<VisitorProfile>({});
  const [autoRead, setAutoRead] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const dictBaseRef = useRef("");

  const current = STEPS[step];
  const canSpeak = speechSynthesisSupported();
  const selectedVoice = voices.find((v) => v.voiceURI === voiceURI) ?? null;

  // Keep the voice list fresh — browsers load voices async.
  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(listVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read each question aloud when it appears (unless auto-read is off).
  useEffect(() => {
    if (!autoRead || !canSpeak) return;
    speak(current.question, selectedVoice);
    setSpeaking(true);
    const t = window.setTimeout(() => setSpeaking(false), 4000);
    return () => {
      window.clearTimeout(t);
      stopSpeaking();
      setSpeaking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, autoRead]);

  const setAnswer = (key: string) => (v: string) => {
    if (current.section === "profile") {
      setProfile((p) => ({ ...p, [key]: v }));
    } else {
      setAnswers((a) => ({ ...a, [key]: v }));
    }
  };

  const readAloud = () => {
    if (!canSpeak) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(current.question, selectedVoice);
    setSpeaking(true);
    window.setTimeout(() => setSpeaking(false), 4000);
  };

  const isLast = step === STEPS.length - 1;
  const value =
    current.section === "profile"
      ? (profile[current.key as keyof VisitorProfile] ?? "")
      : (answers[current.key as keyof ForgeFields] ?? "");
  // About-you steps are all optional — always skippable. Field steps need
  // an answer unless marked optional.
  const canNext = current.section === "profile" || current.optional || value.trim().length > 0;

  const finish = () => onComplete({ fields: answers, profile });

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-gold/30 bg-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-gold">
          Interview me · Question {step + 1} of {STEPS.length}
        </p>
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS.length }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full ${i <= step ? "bg-gold" : "bg-white/15"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-[17px] font-bold leading-snug text-cream">
          {current.question}
        </p>
        {canSpeak ? (
          <button
            type="button"
            onClick={readAloud}
            aria-label={speaking ? "Stop reading" : "Hear the question"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${
              speaking
                ? "animate-pulse border-gold/60 bg-gold/20 text-gold"
                : "border-white/12 bg-canvas text-sand hover:text-cream"
            }`}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        ) : (
          <span className="shrink-0 text-[11.5px] text-clay">
            Voice isn&apos;t available in this browser.
          </span>
        )}
      </div>
      <p className="text-[12.5px] leading-snug text-sand">{current.hint}</p>

      {canSpeak && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRead((a) => !a)}
            aria-pressed={autoRead}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition active:scale-95 ${
              autoRead
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-white/12 bg-canvas text-sand"
            }`}
          >
            Auto-read {autoRead ? "on" : "off"}
          </button>
          {voices.length > 1 && (
            <select
              value={voiceURI ?? ""}
              onChange={(e) => setVoiceURI(e.target.value || null)}
              aria-label="Reading voice"
              className="max-w-[180px] rounded-full border border-white/12 bg-canvas px-3 py-1.5 text-[12px] text-sand outline-none"
            >
              <option value="">Default voice</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => setAnswer(current.key)(e.target.value)}
        rows={3}
        placeholder={current.placeholder}
        className="w-full resize-none rounded-[14px] border border-white/10 bg-canvas p-3 text-[14px] leading-snug text-cream outline-none placeholder:text-clay focus:border-gold/50"
      />
      <div>
        <VoiceInput
          label="Answer by voice"
          onDictationStart={() => {
            dictBaseRef.current = value;
          }}
          onTranscript={(text) => {
            const base = dictBaseRef.current.trim();
            const next = base ? `${base} ${text}` : text;
            setAnswer(current.key)(next);
          }}
        />
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="ghost" size="md" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft size={16} /> Back
          </Button>
        )}
        <div className="flex-1" />
        {current.optional && !isLast && (
          <Button variant="ghost" size="md" onClick={() => setStep((s) => s + 1)}>
            Skip
          </Button>
        )}
        {isLast ? (
          <Button variant="gradient" size="md" onClick={finish} disabled={!answers.job.trim()}>
            <Check size={16} /> Forge my prompt
          </Button>
        ) : (
          <Button variant="gradient" size="md" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
