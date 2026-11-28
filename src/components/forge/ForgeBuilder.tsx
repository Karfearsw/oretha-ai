"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, Download, MessageSquareText, ClipboardCheck, Hammer, Send } from "lucide-react";
import { SegmentedControl, type SegmentItem } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { VoiceInput } from "@/components/forge/VoiceInput";
import {
  scorePrompt,
  buildForged,
  buildProfileContext,
  profilePlaceholders,
  PART_LABELS,
  MODE_LABELS,
  type ForgeFields,
  type ForgeMode,
  type ForgePart,
  type VisitorProfile,
} from "@/lib/promptForge";

const MODES: SegmentItem<ForgeMode>[] = [
  { value: "general", label: "General", icon: MessageSquareText },
  { value: "task", label: "Task", icon: ClipboardCheck },
  { value: "bmad", label: "BMAD Build", icon: Hammer },
];

const PART_ORDER: ForgePart[] = ["job", "why", "guardrails", "done"];

function Field({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-sand">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-[14px] border border-white/10 bg-canvas p-3 text-[14px] leading-snug text-cream outline-none placeholder:text-clay focus:border-gold/50"
      />
    </label>
  );
}

export function ForgeBuilder({
  initialDraft = "",
  initialFields,
  profile,
  onApply,
  onSendToChat,
}: {
  initialDraft?: string;
  /** Pre-fill the builder fields (e.g. from the interview flow). */
  initialFields?: Partial<ForgeFields>;
  /** About-you profile — tailors placeholders and the forged context. */
  profile?: VisitorProfile;
  /** Chat Sheet mode: puts the forged text into the composer. */
  onApply?: (text: string) => void;
  /** Forge page mode: opens a new chat thread prefilled with the forged text. */
  onSendToChat?: (text: string) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [fields, setFields] = useState<ForgeFields>({
    job: initialFields?.job ?? initialDraft,
    why: initialFields?.why ?? "",
    guardrails: initialFields?.guardrails ?? "",
    done: initialFields?.done ?? "",
    role: initialFields?.role ?? "",
    deadline: initialFields?.deadline ?? "",
  });
  const [mode, setMode] = useState<ForgeMode>("general");
  const [copied, setCopied] = useState(false);
  const dictBaseRef = useRef("");

  const score = useMemo(() => scorePrompt(draft), [draft]);
  // The visitor's About-you answers become the Context line of the forged
  // brief, so the output reads like it was written for them — not a
  // template. Their own words only; nothing is invented about them.
  const profileContext = buildProfileContext(profile ?? {});
  const ph = profilePlaceholders(profile ?? {});
  const forged = useMemo(
    () => buildForged(mode, { ...fields, context: profileContext || fields.context }),
    [mode, fields, profileContext],
  );
  const canForge = fields.job.trim().length > 0;

  const setField = (key: keyof ForgeFields) => (v: string) =>
    setFields((f) => ({ ...f, [key]: v }));

  const loadDraftIntoBuilder = () => {
    setFields((f) => ({ ...f, job: draft }));
  };

  const copyForged = async () => {
    try {
      await navigator.clipboard.writeText(forged);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = forged;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const downloadMd = () => {
    const blob = new Blob([forged], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-forge-${mode}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreTone = score.total >= 7 ? "complete" : score.total >= 4 ? "gold" : "alert";

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Scorer */}
      <section aria-label="Score your prompt" className="flex flex-col gap-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Paste a rough prompt — or type it the way you'd normally say it…"
          className="w-full resize-none rounded-[18px] border border-white/10 bg-elevated p-4 text-[15px] leading-snug text-cream outline-none placeholder:text-clay focus:border-gold/50"
        />
        <div>
          <VoiceInput
            label="Dictate a prompt"
            onDictationStart={() => {
              dictBaseRef.current = draft;
            }}
            onTranscript={(text) => {
              const base = dictBaseRef.current.trim();
              setDraft(base ? `${base} ${text}` : text);
            }}
          />
        </div>
        <div className="glass-card flex items-center justify-between rounded-[16px] border border-white/8 bg-elevated px-4 py-3">
          <div>
            <p className="text-[12px] text-clay">Prompt score</p>
            <p className="font-display text-[26px] font-bold leading-none text-cream">
              {score.total}
              <span className="text-[15px] text-clay"> / 10</span>
            </p>
          </div>
          <Chip tone={scoreTone}>
            {score.total >= 7
              ? "Strong brief"
              : score.total >= 4
                ? "Half-built"
                : score.total > 0
                  ? "Beginner band"
                  : "Nothing to score yet"}
          </Chip>
        </div>
        <div className="glass-card flex flex-col gap-2 rounded-[16px] border border-white/8 bg-elevated p-4">
          {PART_ORDER.map((part) => {
            const p = score.parts[part];
            const pct = Math.round((p.score / 2.5) * 100);
            return (
              <div key={part}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-cream">{PART_LABELS[part]}</span>
                  <span className="text-[12px] text-clay">{p.score.toFixed(1)} / 2.5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? "bg-complete" : pct >= 40 ? "bg-gold" : "bg-alert"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[12px] leading-snug text-sand">{p.note}</p>
              </div>
            );
          })}
        </div>
        {score.flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {score.flags.map((f) => (
              <Chip key={f} tone="alert">
                {f}
              </Chip>
            ))}
          </div>
        )}
        {draft.trim() && (
          <Button variant="ghost" size="sm" onClick={loadDraftIntoBuilder}>
            Use this as the job ↓
          </Button>
        )}
      </section>

      {/* Builder */}
      <section aria-label="Forge the prompt" className="flex flex-col gap-2.5">
        <h2 className="font-display text-[16px] font-bold text-cream">Fill the gaps</h2>
        <Field label="The job — the whole task, not one step" value={fields.job} onChange={setField("job")} rows={3} placeholder={ph.job} />
        <Field label="The why — so it makes small calls your way" value={fields.why} onChange={setField("why")} placeholder={ph.why} />
        <Field label="Guardrails — only the ones that matter" value={fields.guardrails} onChange={setField("guardrails")} placeholder={ph.guardrails} />
        <Field label="What done looks like — checks it must pass" value={fields.done} onChange={setField("done")} placeholder={ph.done} />
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Role (optional)" value={fields.role ?? ""} onChange={setField("role")} rows={1} placeholder={ph.role} />
          <Field label="Deadline (optional)" value={fields.deadline ?? ""} onChange={setField("deadline")} rows={1} placeholder="e.g. Friday" />
        </div>
      </section>

      {/* Mode + output */}
      <section aria-label="Forged prompt" className="flex flex-col gap-2.5">
        <SegmentedControl items={MODES} value={mode} onChange={setMode} />
        <div className="glass-card rounded-[16px] border border-gold/25 bg-elevated p-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-gold">
            {MODE_LABELS[mode]}
          </p>
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-cream">
            {forged}
          </pre>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" size="md" onClick={copyForged} disabled={!canForge} className="flex-1">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
          <Button variant="ghost" size="md" onClick={downloadMd} disabled={!canForge} aria-label="Download as Markdown">
            <Download size={16} />
          </Button>
        </div>
        {onApply && (
          <Button variant="primary" size="lg" onClick={() => onApply(forged)} disabled={!canForge}>
            <MessageSquareText size={16} /> Use this in chat
          </Button>
        )}
        {onSendToChat && (
          <Button variant="primary" size="lg" onClick={() => onSendToChat(forged)} disabled={!canForge}>
            <Send size={16} /> Send to chat
          </Button>
        )}
        <p className="text-center text-[11.5px] leading-snug text-clay">
          Nothing sends itself — copy it, use it in chat, or send it to a new thread. You approve every send.
        </p>
      </section>
    </div>
  );
}
