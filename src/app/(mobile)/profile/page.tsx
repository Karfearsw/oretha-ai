"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  History,
  Fingerprint,
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
import { SOUL_MD, MEMORY_MD, IDENTITY_MD, CONNECTORS } from "@/lib/mock/content";

const FILES = [
  { name: "SOUL.md", icon: ShieldCheck, content: SOUL_MD, desc: "Persona & values" },
  { name: "MEMORY.md", icon: History, content: MEMORY_MD, desc: "Durable memory" },
  { name: "IDENTITY.md", icon: Fingerprint, content: IDENTITY_MD, desc: "Who Oretha is" },
];

export default function ProfilePage() {
  const user = useSessionUser();
  const router = useRouter();
  const [fileOpen, setFileOpen] = useState<string | null>(null);
  const [censorship, setCensorship] = useState(true);
  const [empowerment, setEmpowerment] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.name ?? "Guest";
  const plan = user?.plan ?? "free";

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/welcome");
    router.refresh();
  }

  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header className="flex flex-col items-center gap-2.5 pt-2 text-center">
        <span className="relative">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet font-display text-[30px] font-bold text-canvas">
            {user?.avatarSeed || displayName.charAt(0).toUpperCase()}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-canvas bg-elevated">
            <FileText size={13} className="text-sand" />
          </span>
        </span>
        <div>
          <h1 className="font-display text-[24px] font-bold text-cream">
            {displayName}
          </h1>
          <p className="text-[13px] text-sand">
            {user?.tagline || user?.email || "Founder, Karfear's Softwear"}
          </p>
        </div>
      </header>

      <section aria-label="Oretha's core files" className="flex flex-col gap-2.5">
        <h2 className="font-display text-[16px] font-bold text-cream">
          Oretha&apos;s core files
        </h2>
        {FILES.map((f) => (
          <button
            key={f.name}
            onClick={() => setFileOpen(f.name)}
            className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet/20 text-[#c4b5fd]">
              <f.icon size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-mono text-[14px] font-semibold text-cream">
                {f.name}
              </span>
              <span className="block text-[12px] text-clay">{f.desc}</span>
            </span>
            <ChevronRight size={18} className="text-clay" />
          </button>
        ))}
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
          Ownership controls
        </h2>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-cream">
              Censorship level
            </p>
            <p className="text-[12.5px] leading-snug text-clay">
              {censorship
                ? "Open mode — straight answers, legal and safety guardrails only."
                : "Guarded mode — extra filtering on sensitive topics."}
            </p>
          </div>
          <Toggle
            checked={censorship}
            onChange={setCensorship}
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
            onChange={setEmpowerment}
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
        Oretha AI v0.2 · Uncensored by design · Your data stays yours
      </p>

      <FileSheet
        open={fileOpen !== null}
        filename={fileOpen ?? ""}
        content={FILES.find((f) => f.name === fileOpen)?.content ?? ""}
        onClose={() => setFileOpen(null)}
      />
    </main>
  );
}
