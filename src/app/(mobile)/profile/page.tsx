"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  History,
  Fingerprint,
  Scale,
  Users,
  Crown,
  ChevronRight,
  Plug,
  Check,
  LogOut,
} from "lucide-react";
import { FileSheet } from "@/components/ui/FileSheet";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useSessionUser } from "@/components/layout/AppShell";
import { CONNECTORS } from "@/lib/mock/content";
import { generateAgentFiles } from "@/lib/agentFiles";

const FILE_META: Record<string, { icon: typeof FileText; desc: string }> = {
  "IDENTITY.md": { icon: Fingerprint, desc: "Who she is" },
  "SOUL.md": { icon: ShieldCheck, desc: "Persona & voice" },
  "USER.md": { icon: Users, desc: "What she knows about you" },
  "RULES.md": { icon: Scale, desc: "Hard boundaries" },
  "MEMORY.md": { icon: History, desc: "Durable memory" },
};

const FILE_ORDER = ["IDENTITY.md", "SOUL.md", "USER.md", "RULES.md", "MEMORY.md"];

export default function ProfilePage() {
  const user = useSessionUser();
  const router = useRouter();

  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileOpen, setFileOpen] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [censorship, setCensorship] = useState(
    (user?.censorship as "open" | "guarded" | "strict") ?? "open",
  );
  const [empowerment, setEmpowerment] = useState(user?.empowerment ?? true);

  const agentName = user?.agentName || "Oretha";
  const first = (user?.name ?? "friend").split(" ")[0];

  // fallback templates so the sheet is never empty, even pre-generation
  const fallback = useCallback(
    () =>
      generateAgentFiles({
        agentName,
        agentEmoji: user?.agentEmoji ?? "",
        voice: "balanced",
        censorship,
        empowerment,
        responseLength: "balanced",
        timezone: null,
        userFirstName: first,
        userWork: null,
        userInterests: [],
        mailboxApiKey: null,
      }),
    [agentName, user, censorship, empowerment, first],
  );

  useEffect(() => {
    fetch("/api/agent-files")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const map: Record<string, string> = {};
        for (const f of data?.files ?? []) map[f.name] = f.content;
        setFiles(map);
      })
      .catch(() => setFiles({}));
  }, []);

  async function saveFile(name: string, content: string) {
    setFiles((f) => ({ ...f, [name]: content }));
    await fetch("/api/agent-files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
  }

  async function patchSettings(data: Record<string, unknown>) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/welcome");
    router.refresh();
  }

  const plan = user?.plan ?? "free";

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header className="flex flex-col items-center gap-2.5 pt-2 text-center">
        <span className="relative">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet font-display text-[30px] font-bold text-canvas">
            {user?.avatarSeed || first.charAt(0).toUpperCase()}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-canvas bg-elevated">
            <FileText size={13} className="text-sand" />
          </span>
        </span>
        <div>
          <h1 className="font-display text-[24px] font-bold text-cream">
            {user?.name ?? "Guest"}
          </h1>
          <p className="text-[13px] text-sand">
            {user?.email ?? ""}
          </p>
        </div>
      </header>

      <section aria-label="Agent files" className="flex flex-col gap-2.5">
        <h2 className="font-display text-[16px] font-bold text-cream">
          {agentName}&apos;s files
        </h2>
        {FILE_ORDER.map((name) => {
          const meta = FILE_META[name];
          return (
            <button
              key={name}
              onClick={() => setFileOpen(name)}
              className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet/20 text-[#c4b5fd]">
                <meta.icon size={18} />
              </span>
              <span className="flex-1">
                <span className="block font-mono text-[14px] font-semibold text-cream">
                  {name}
                </span>
                <span className="block text-[12px] text-clay">
                  {files[name] ? meta.desc : `${meta.desc} · not set up yet`}
                </span>
              </span>
              <ChevronRight size={18} className="text-clay" />
            </button>
          );
        })}
      </section>

      <section aria-label="Plan">
        <div
          className="relative overflow-hidden rounded-[18px] border border-gold/25 p-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,162,78,0.14), rgba(124,58,237,0.14))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crown size={20} className="text-gold" />
              <div>
                <p className="font-display text-[16px] font-bold text-cream">
                  {plan === "free" ? "Free plan" : `${plan[0].toUpperCase()}${plan.slice(1)} plan`}
                </p>
                <p className="text-[12px] text-sand">
                  {plan === "free"
                    ? "3 agents · 1 workflow · community models"
                    : "Unlimited agents · 5 workflows · priority models"}
                </p>
              </div>
            </div>
            {plan === "free" && (
              <Button variant="primary" size="sm">
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </section>

      <section
        aria-label="Ownership controls"
        className="flex flex-col gap-3 rounded-[18px] border border-white/8 bg-elevated p-4"
      >
        <h2 className="font-display text-[16px] font-bold text-cream">
          House rules
        </h2>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-cream">
              Censorship level
            </p>
            <p className="text-[12.5px] leading-snug text-clay">
              {censorship === "open"
                ? "Open mode — straight answers, legal and safety guardrails only."
                : censorship === "guarded"
                  ? "Guarded — flags high-stakes topics."
                  : "Strict — conservative on sensitive topics."}
            </p>
          </div>
          <Toggle
            checked={censorship === "open"}
            onChange={(open) => {
              const next = open ? "open" : "guarded";
              setCensorship(next);
              patchSettings({ censorship: next });
            }}
            label="Censorship level"
          />
        </div>
        <div className="h-px bg-white/6" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-cream">
              Black empowerment mode
            </p>
            <p className="text-[12.5px] leading-snug text-clay">
              {empowerment
                ? "Full warmth, voice, and gold-forward visuals."
                : "Neutral tone and standard visuals."}
            </p>
          </div>
          <Toggle
            checked={empowerment}
            onChange={(v) => {
              setEmpowerment(v);
              patchSettings({ empowerment: v });
            }}
            label="Black empowerment mode"
          />
        </div>
      </section>

      <section aria-label="Connectors" className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-cream">
          <Plug size={16} className="text-gold" /> Connectors
        </h2>
        {CONNECTORS.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-3.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 font-display text-[14px] font-bold text-cream">
              {c.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-cream">{c.name}</p>
              <p className="truncate text-[12px] text-clay">{c.desc}</p>
            </div>
            {c.connected ? (
              <Chip tone="complete">
                <Check size={11} /> Linked
              </Chip>
            ) : (
              <Button variant="ghost" size="sm">
                Connect
              </Button>
            )}
          </div>
        ))}
      </section>

      <button
        onClick={signOut}
        disabled={signingOut}
        className="flex items-center justify-center gap-2 rounded-[16px] border border-alert/30 bg-alert/10 py-3.5 text-[15px] font-semibold text-alert transition active:scale-[0.98] disabled:opacity-50"
      >
        <LogOut size={17} />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>

      <p className="pb-2 text-center text-[11.5px] text-clay">
        Oretha AI v0.3 · Uncensored by design · Your data stays yours
      </p>

      <FileSheet
        open={fileOpen !== null}
        filename={fileOpen ?? ""}
        content={
          fileOpen
            ? (files[fileOpen] ?? fallback()[fileOpen as keyof ReturnType<typeof generateAgentFiles>] ?? "")
            : ""
        }
        onClose={() => setFileOpen(null)}
        onSave={saveFile}
      />
    </main>
  );
}
