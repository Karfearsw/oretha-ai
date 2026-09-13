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
  KeyRound,
  Loader2,
  Zap,
  X,
  ExternalLink,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { FileSheet } from "@/components/ui/FileSheet";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useSessionUser } from "@/components/layout/AppShell";
import Link from "next/link";
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

  // BYOK LLM settings
  const [llm, setLlm] = useState<{
    hasKey: boolean;
    provider: string | null;
    model: string | null;
  } | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyProvider, setKeyProvider] = useState("meta");
  const [KeyValue, setKeyValue] = useState("");
  const [keyModel, setKeyModel] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [keyNote, setKeyNote] = useState<string | null>(null);

  // Upgrade flow
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Connectors
  interface ConnectorRow {
    id: string;
    name: string;
    desc: string;
    keyConnectable: boolean;
    oauthOnly: boolean;
    connected: boolean;
    meta: Record<string, unknown> | null;
    lastSyncAt: string | null;
    lastSyncInfo: string | null;
    keyHint?: string;
    keyUrl?: string;
  }
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [connOpen, setConnOpen] = useState(false);
  const [connKind, setConnKind] = useState<string>("github");
  const [connKey, setConnKey] = useState("");
  const [connBusy, setConnBusy] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);

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
    fetch("/api/user-llm")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) setLlm(d.settings);
        if (d?.providers) setProviders(d.providers);
      })
      .catch(() => {});
    fetch("/api/connectors")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.connectors)) setConnectors(d.connectors);
      })
      .catch(() => {});
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

  async function saveKey() {
    if (keySaving) return;
    setKeySaving(true);
    setKeyNote(null);
    try {
      const r = await fetch("/api/user-llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: KeyValue.trim(),
          provider: keyProvider,
          model: keyModel.trim() || null,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setKeyNote(
          d?.error === "unknown_provider"
            ? "Pick a provider from the list."
            : "That key doesn't look right — check it and try again.",
        );
        return;
      }
      setLlm(d.settings);
      setKeyValue("");
      setKeyOpen(false);
      setKeyNote(
        d.settings?.hasKey
          ? "Key saved — your own model now answers first."
          : "Key removed — back on the community models.",
      );
      setTimeout(() => setKeyNote(null), 5000);
    } finally {
      setKeySaving(false);
    }
  }

  async function connectConnector() {
    if (connBusy) return;
    setConnBusy(true);
    setConnError(null);
    try {
      const r = await fetch("/api/connectors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: connKind, apiKey: connKey.trim() }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setConnError(
          d?.error === "not_key_connectable"
            ? "This connector doesn't take a key."
            : (d?.error ?? "Validation failed — check the key."),
        );
        return;
      }
      // Connected — sync right away so work lands on the board.
      await fetch("/api/connectors/sync", { method: "POST" }).catch(() => {});
      const fresh = await fetch("/api/connectors").then((x) => x.json()).catch(() => null);
      if (Array.isArray(fresh?.connectors)) setConnectors(fresh.connectors);
      setConnOpen(false);
      setKeyNote("Connected — syncing work to the task board.");
      setTimeout(() => setKeyNote(null), 5000);
    } finally {
      setConnBusy(false);
    }
  }

  async function disconnectConnector(kind: string) {
    await fetch(`/api/connectors?kind=${kind}`, { method: "DELETE" });
    const fresh = await fetch("/api/connectors").then((x) => x.json()).catch(() => null);
    if (Array.isArray(fresh?.connectors)) setConnectors(fresh.connectors);
  }

  async function upgrade(toPlan: "free" | "pro") {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const r = await fetch("/api/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: toPlan }),
      });
      if (r.ok) {
        setUpgradeOpen(false);
        router.refresh();
      }
    } finally {
      setUpgrading(false);
    }
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
            {plan === "free" ? (
              <Button variant="primary" size="sm" onClick={() => setUpgradeOpen(true)}>
                Upgrade
              </Button>
            ) : (
              <Chip tone="gold">
                <Crown size={11} /> Pro
              </Chip>
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

      <section aria-label="API keys" className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-cream">
          <KeyRound size={16} className="text-gold" /> Model access
        </h2>
        <button
          onClick={() => setKeyOpen(true)}
          className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-4 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gold/15 text-gold">
            <Zap size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-cream">
              Your own API key
            </span>
            <span className="block text-[12px] leading-snug text-clay">
              {llm?.hasKey
                ? `Active — ${llm.provider ?? "custom"}${llm.model ? ` · ${llm.model}` : ""} · answers first, community models as backup`
                : "Bring your own (Meta, OpenAI, Groq…) — encrypted at rest"}
            </span>
          </span>
          <ChevronRight size={18} className="text-clay" />
        </button>
        {keyNote && (
          <p className="rounded-[12px] border border-gold/30 bg-gold/10 px-3 py-2 text-center text-[11.5px] leading-snug text-gold">
            {keyNote}
          </p>
        )}
      </section>

      <section aria-label="Connectors" className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-cream">
          <Plug size={16} className="text-gold" /> Connectors
        </h2>
        {connectors.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-elevated p-3.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 font-display text-[14px] font-bold text-cream">
              {c.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-cream">{c.name}</p>
              <p className="truncate text-[12px] text-clay">
                {c.connected && c.id === "email" && c.meta?.address
                  ? String(c.meta.address)
                  : c.connected && c.meta?.login
                    ? `@${String(c.meta.login)}`
                    : c.connected && c.meta?.name
                      ? String(c.meta.name)
                      : c.desc}
              </p>
              {c.connected && c.lastSyncInfo && c.lastSyncInfo !== "mailroom" && (
                <p className="truncate text-[11px] text-clay/70">
                  Last sync: {c.lastSyncInfo}
                </p>
              )}
            </div>
            {c.connected ? (
              c.id === "email" ? (
                <Link
                  href="/office/inbox"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-sand"
                >
                  Open
                </Link>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Chip tone="complete">
                    <Check size={11} /> Linked
                  </Chip>
                  <button
                    aria-label={`Disconnect ${c.name}`}
                    onClick={() => disconnectConnector(c.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-clay transition hover:text-alert"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            ) : c.oauthOnly ? (
              <Chip tone="neutral">Soon</Chip>
            ) : c.id === "email" ? (
              <Link
                href="/office/inbox"
                className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[12px] font-semibold text-gold"
              >
                Set up
              </Link>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConnKind(c.id);
                  setConnKey("");
                  setConnError(null);
                  setConnOpen(true);
                }}
              >
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

      {/* API key editor */}
      <Sheet open={keyOpen} onClose={() => setKeyOpen(false)} title="Your own API key">
        <div className="flex flex-col gap-3.5 pb-4">
          <p className="text-[12.5px] leading-snug text-sand">
            Your key is encrypted (AES-256-GCM) and used only to answer your
            requests. When set, it answers first; platform models stay as
            backup. Remove it anytime.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-clay">
              Provider
            </label>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {(providers.length ? providers : ["meta", "openai", "groq"]).map((p) => (
                <button
                  key={p}
                  onClick={() => setKeyProvider(p)}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition ${
                    keyProvider === p
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-white/10 bg-elevated text-sand"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-clay">
              API key
            </label>
            <input
              type="password"
              autoComplete="off"
              value={KeyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={llm?.hasKey ? "•••••••• (saved — paste to replace)" : "Paste your key"}
              className="w-full rounded-[14px] border border-white/10 bg-canvas p-3.5 font-mono text-[14px] text-cream outline-none placeholder:text-clay"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-clay">
              Model (optional)
            </label>
            <input
              value={keyModel}
              onChange={(e) => setKeyModel(e.target.value)}
              placeholder="Default for the provider"
              className="w-full rounded-[14px] border border-white/10 bg-canvas p-3.5 font-mono text-[13.5px] text-cream outline-none placeholder:text-clay"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="gradient"
              size="md"
              onClick={saveKey}
              loading={keySaving}
              disabled={keySaving || (!KeyValue.trim() && !llm?.hasKey)}
            >
              {keySaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {KeyValue.trim() ? "Save key" : "Keep saved"}
            </Button>
            {llm?.hasKey && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setKeyValue("");
                }}
              >
                Type new key
              </Button>
            )}
            {llm?.hasKey && !KeyValue.trim() && (
              <Button
                variant="ghost"
                size="md"
                onClick={async () => {
                  const r = await fetch("/api/user-llm", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ apiKey: "", provider: keyProvider }),
                  });
                  const d = await r.json().catch(() => null);
                  if (d?.settings) setLlm(d.settings);
                  setKeyOpen(false);
                  setKeyNote("Key removed — back on the community models.");
                  setTimeout(() => setKeyNote(null), 5000);
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      {/* Connector connect sheet */}
      <Sheet open={connOpen} onClose={() => setConnOpen(false)} title={`Connect ${connectors.find(c => c.id === connKind)?.name ?? ""}`}>
        <div className="flex flex-col gap-3.5 pb-4">
          <p className="text-[12.5px] leading-snug text-sand">
            Paste a {connectors.find(c => c.id === connKind)?.keyHint ?? "API key"}. We
            verify it live, store it encrypted (AES-256-GCM), and pull your
            assigned work onto the task board.
          </p>

          <input
            type="password"
            autoComplete="off"
            value={connKey}
            onChange={(e) => setConnKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connectConnector()}
            placeholder="Paste your key"
            className="w-full rounded-[14px] border border-white/10 bg-canvas p-3.5 font-mono text-[14px] text-cream outline-none placeholder:text-clay"
          />

          {connError && (
            <p className="rounded-[12px] border border-alert/30 bg-alert/10 px-3 py-2 text-[12px] leading-snug text-alert">
              {connError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="gradient"
              size="md"
              onClick={connectConnector}
              loading={connBusy}
              disabled={connBusy || connKey.trim().length < 8}
            >
              {connBusy ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
              Verify & connect
            </Button>
            {connectors.find((c) => c.id === connKind)?.keyUrl && (
              <a
                href={connectors.find((c) => c.id === connKind)?.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-sand"
              >
                Get key <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      </Sheet>

      {/* Upgrade sheet */}
      <Sheet open={upgradeOpen} onClose={() => setUpgradeOpen(false)} title="Oretha Pro">
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col gap-2.5 rounded-[16px] border border-gold/25 p-4"
            style={{ background: "linear-gradient(135deg, rgba(212,162,78,0.12), rgba(124,58,237,0.12))" }}
          >
            <p className="font-display text-[15px] font-bold text-cream">
              Everything unlocks:
            </p>
            {["Unlimited agents in your crew", "Up to 5 scheduled workflows", "Priority models — your key rides first"].map((f) => (
              <p key={f} className="flex items-center gap-2 text-[13.5px] text-sand">
                <Check size={14} className="shrink-0 text-gold" /> {f}
              </p>
            ))}
            <p className="text-[12px] leading-snug text-clay">
              Early access: Pro activates right now, no card. When billing
              arrives, existing Pro members keep their founding rate.
            </p>
          </div>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => upgrade("pro")}
            loading={upgrading}
          >
            <Crown size={18} /> {upgrading ? "Activating…" : "Activate Pro"}
          </Button>
          <button
            onClick={() => setUpgradeOpen(false)}
            className="text-center text-[13px] font-semibold text-clay"
          >
            Not now
          </button>
        </div>
      </Sheet>

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
