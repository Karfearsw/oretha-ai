"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  MessageSquareHeart,
  UserRound,
  Scale,
  UsersRound,
} from "lucide-react";
import { OrethaMark } from "@/components/ui/OrethaMark";
import type { SetupPayload } from "@/components/setup/types";

const VOICES = [
  { value: "straight", label: "Straight", desc: "Direct, no chaser" },
  { value: "warm", label: "Warm", desc: "Encouraging, real" },
  { value: "playful", label: "Playful", desc: "Wit and swagger" },
  { value: "balanced", label: "Balanced", desc: "Matches your energy" },
] as const;

const LENGTHS = [
  { value: "concise", label: "Concise", desc: "Short and to it" },
  { value: "balanced", label: "Balanced", desc: "As long as it needs" },
  { value: "detailed", label: "Detailed", desc: "Deep and thorough" },
] as const;

const CENSORSHIP = [
  { value: "open", label: "Open", desc: "Uncensored by design" },
  { value: "guarded", label: "Guarded", desc: "Flags high-stakes stuff" },
  { value: "strict", label: "Strict", desc: "Conservative on sensitive topics" },
] as const;

const CREW = [
  "Kevo · Engineering",
  "Muse · Media",
  "Booker · Real Estate",
  "Sentry · Security",
  "Steward · Office Ops",
];

const STEP_META = [
  { icon: Sparkles, title: "Meet your agent" },
  { icon: MessageSquareHeart, title: "Her soul" },
  { icon: UserRound, title: "About you" },
  { icon: Scale, title: "House rules" },
  { icon: UsersRound, title: "Your crew" },
];

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<SetupPayload>({
    agentName: "",
    agentEmoji: "",
    voice: "straight",
    censorship: "open",
    empowerment: true,
    responseLength: "balanced",
    timezone: null,
    userFirstName: "",
    userWork: "",
    userInterests: [],
  });

  const set = <K extends keyof SetupPayload>(key: K, value: SetupPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const previewName = form.agentName.trim() || "Oretha";

  const readyFiles = useMemo(
    () => ["IDENTITY.md", "SOUL.md", "USER.md", "RULES.md", "MEMORY.md"],
    [],
  );

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, timezone: tz }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Setup couldn't be saved. Try again.");
        setBusy(false);
        return;
      }
      router.replace("/hub");
      router.refresh();
    } catch {
      setError("Network hiccup. Try again.");
      setBusy(false);
    }
  }

  const inputCls =
    "h-13 w-full rounded-[14px] border border-white/12 bg-elevated px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50";

  return (
    <main className="flex flex-1 flex-col px-6 pb-8">
      {/* Progress */}
      <div className="flex items-center gap-1.5 pt-4">
        {STEP_META.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-gradient-to-r from-gold to-violet" : "bg-white/10"}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-4">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-sand"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gold">
          Step {step + 1} of 5 · {STEP_META[step].title}
        </p>
      </div>

      {/* keyed remount (no exit anim) so rapid Continue taps can never wedge the pane */}
      <div>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 flex-col pt-5"
        >
          {/* Step 1 — Name */}
          {step === 0 && (
            <div className="flex flex-1 flex-col items-center gap-6 text-center">
              <OrethaMark size={96} priority />
              <div>
                <h1 className="font-display text-[26px] font-bold text-cream">
                  Someone&apos;s waiting to meet you.
                </h1>
                <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-snug text-sand">
                  Before her first word, give her a name. What do you call her?
                </p>
              </div>
              <div className="flex w-full items-center gap-2">
                <input
                  value={form.agentName}
                  onChange={(e) => set("agentName", e.target.value)}
                  placeholder="Oretha"
                  maxLength={40}
                  autoFocus
                  className={inputCls}
                />
                <input
                  value={form.agentEmoji}
                  onChange={(e) => set("agentEmoji", e.target.value)}
                  placeholder="✊🏿"
                  maxLength={4}
                  className={`${inputCls} w-20 text-center`}
                />
              </div>
              <p className="text-[12.5px] text-clay">
                She&apos;ll answer to {previewName}
                {form.agentEmoji ? ` ${form.agentEmoji}` : ""} everywhere —
                chats, office, everywhere.
              </p>
            </div>
          )}

          {/* Step 2 — Soul */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-[24px] font-bold text-cream">
                  How does {previewName} talk?
                </h1>
                <p className="mt-1.5 text-[13px] text-sand">
                  Her voice shapes every reply. You can rewrite her soul file
                  anytime.
                </p>
              </div>
              <OptionGrid
                options={VOICES}
                value={form.voice}
                onChange={(v) => set("voice", v)}
              />
              <div>
                <p className="mb-2 text-[13px] font-semibold text-sand">
                  Default answer length
                </p>
                <OptionGrid
                  options={LENGTHS}
                  value={form.responseLength}
                  onChange={(v) => set("responseLength", v)}
                  compact
                />
              </div>
            </div>
          )}

          {/* Step 3 — About you */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-[24px] font-bold text-cream">
                  And who is she working for?
                </h1>
                <p className="mt-1.5 text-[13px] text-sand">
                  This becomes her USER.md — the context she brings to every
                  conversation.
                </p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-sand">
                  Your first name
                </span>
                <input
                  value={form.userFirstName}
                  onChange={(e) => set("userFirstName", e.target.value)}
                  placeholder="Timmy"
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-sand">
                  What do you do? <span className="font-normal text-clay">(optional)</span>
                </span>
                <input
                  value={form.userWork ?? ""}
                  onChange={(e) => set("userWork", e.target.value)}
                  placeholder="Founder, Karfear's Softwear"
                  className={inputCls}
                />
              </label>
              <ChipEditor
                label="What are you into? (optional)"
                items={form.userInterests}
                onChange={(v) => set("userInterests", v)}
                placeholder="Real estate, music, code…"
              />
            </div>
          )}

          {/* Step 4 — House rules */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-[24px] font-bold text-cream">
                  Set the house rules.
                </h1>
                <p className="mt-1.5 text-[13px] text-sand">
                  These become RULES.md — hard boundaries she follows in every
                  conversation.
                </p>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-sand">
                  Censorship level
                </p>
                <OptionGrid
                  options={CENSORSHIP}
                  value={form.censorship}
                  onChange={(v) => set("censorship", v)}
                />
                {form.censorship === "open" && (
                  <p className="mt-2 text-[12px] leading-snug text-clay">
                    Uncensored means no moralizing on lawful topics — legal and
                    safety guardrails still apply.
                  </p>
                )}
              </div>
              <button
                onClick={() => set("empowerment", !form.empowerment)}
                className="flex items-center justify-between rounded-[16px] border border-white/10 bg-elevated p-4 text-left"
              >
                <span>
                  <span className="block text-[14.5px] font-semibold text-cream">
                    Black empowerment mode
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-clay">
                    Pride, warmth, gold-standard confidence
                  </span>
                </span>
                <span
                  className={`flex h-7 w-12 shrink-0 items-center rounded-full border transition ${form.empowerment ? "border-gold/60 bg-gold/30" : "border-white/15 bg-white/8"}`}
                >
                  <span
                    className={`h-5 w-5 rounded-full transition-all ${form.empowerment ? "ml-[26px] bg-gold" : "ml-[3px] bg-sand"}`}
                  />
                </span>
              </button>
            </div>
          )}

          {/* Step 5 — Crew + ready */}
          {step === 4 && (
            <div className="flex flex-1 flex-col">
              <div>
                <h1 className="font-display text-[24px] font-bold text-cream">
                  Last thing — the crew.
                </h1>
                <p className="mt-1.5 text-[13px] text-sand">
                  Specialist agents {previewName} can delegate to. You can add
                  or remove them later.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {CREW.map((c) => {
                  const on = true;
                  return (
                    <div
                      key={c}
                      className="flex items-center justify-between rounded-[14px] border border-white/8 bg-elevated px-4 py-3"
                    >
                      <span className="text-[14px] text-cream">{c}</span>
                      {on && (
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-complete">
                          <Check size={13} /> On
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-[16px] border border-gold/25 bg-gradient-to-br from-gold/10 to-violet/10 p-4">
                <p className="text-[12px] font-bold uppercase tracking-wide text-gold">
                  {previewName}&apos;s files, ready to write
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {readyFiles.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-white/8 px-2.5 py-1 font-mono text-[11px] text-cream"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 text-[12px] leading-snug text-clay">
                  Every choice you made becomes a line in these files — her
                  identity, soul, knowledge of you, and rules. Editable anytime
                  in Profile.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {error && (
        <p className="mt-3 rounded-[12px] border border-alert/30 bg-alert/10 px-3.5 py-2.5 text-[13px] text-alert">
          {error}
        </p>
      )}

      <div className="pt-5">
        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-gold to-violet font-display text-[16px] font-semibold text-canvas transition active:scale-[0.98]"
          >
            Continue <ArrowRight size={17} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={busy}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-gold to-violet font-display text-[16px] font-semibold text-canvas transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy
              ? "Writing her files…"
              : `Bring ${previewName} home`}
            <Sparkles size={16} />
          </button>
        )}
      </div>
    </main>
  );
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: readonly { value: T; label: string; desc: string }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-[14px] border p-3.5 text-left transition active:scale-[0.98] ${
              active
                ? "border-gold/60 bg-gold/12"
                : "border-white/10 bg-elevated"
            }`}
          >
            <span
              className={`block text-[14.5px] font-semibold ${active ? "text-gold" : "text-cream"}`}
            >
              {o.label}
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-clay">
              {o.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChipEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (v && !items.includes(v) && items.length < 12) {
      onChange([...items, v]);
    }
    setDraft("");
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-sand">{label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="h-13 w-full rounded-[14px] border border-white/12 bg-elevated px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
      />
      {items.length > 0 && (
        <span className="mt-1 flex flex-wrap gap-2">
          {items.map((it) => (
            <button
              key={it}
              onClick={() => onChange(items.filter((x) => x !== it))}
              className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/12 px-3 py-1.5 text-[12.5px] text-gold"
            >
              {it} <span aria-hidden>×</span>
            </button>
          ))}
        </span>
      )}
    </label>
  );
}
