"use client";

/* Watches panel for the /workflows screen (OpenMuse "Goals & Tracking").
 * Lists the user's page watches with status, next-due, run-now, enable
 * toggle, and delete — plus a create sheet. Alerts land on the Task Board. */

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Plus,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  DollarSign,
  Type as TypeIcon,
  AlertTriangle,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

interface WatchRow {
  id: string;
  name: string;
  url: string;
  kind: string;
  needle: string | null;
  threshold: number | null;
  schedule: string;
  enabled: boolean;
  lastCheckAt: string | null;
  lastStatus: string;
  lastError: string | null;
  lastValue: string | null;
  failCount: number;
  nextDueAt: string;
}

const KIND_META: Record<string, { label: string; icon: typeof Eye }> = {
  change: { label: "Content change", icon: Eye },
  text: { label: "Text appears", icon: Search },
  price: { label: "Price threshold", icon: DollarSign },
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WatchPanel() {
  const [watches, setWatches] = useState<WatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"change" | "text" | "price">("change");
  const [needle, setNeedle] = useState("");
  const [threshold, setThreshold] = useState("");
  const [schedule, setSchedule] = useState<"hourly" | "daily">("daily");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/watches");
    if (res.ok) {
      const d = await res.json();
      setWatches(d.watches ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          kind,
          needle: kind === "text" ? needle : null,
          threshold: kind === "price" ? Number(threshold) : null,
          schedule,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(data?.error ?? "Couldn't save. Try again.");
        return;
      }
      setCreateOpen(false);
      setName("");
      setUrl("");
      setNeedle("");
      setThreshold("");
      setKind("change");
      setSchedule("daily");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(w: WatchRow) {
    setBusyId(w.id);
    await fetch(`/api/watches/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !w.enabled }),
    });
    await load();
    setBusyId(null);
  }

  async function runNow(w: WatchRow) {
    setBusyId(w.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/watches/${w.id}/check`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.result) {
        const r = data.result;
        setNotice(
          r.status === "alert"
            ? r.alerted
              ? r.message
              : r.message // dedup message already on the board
            : r.status === "error"
              ? `Check failed: ${r.message}`
              : r.message,
        );
      } else {
        setNotice(data?.error ?? "Check failed.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(w: WatchRow) {
    setBusyId(w.id);
    await fetch(`/api/watches/${w.id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  const statusChip = (w: WatchRow) => {
    if (!w.enabled) return <Chip tone="neutral">Paused</Chip>;
    if (w.lastStatus === "error")
      return (
        <Chip tone="alert">
          <AlertTriangle size={11} /> Error{w.failCount > 1 ? ` · backing off ×${w.failCount}` : ""}
        </Chip>
      );
    if (w.lastStatus === "alert") return <Chip tone="gold">Alert sent</Chip>;
    if (w.lastStatus === "ok") return <Chip tone="complete">OK</Chip>;
    return <Chip tone="neutral">Not checked yet</Chip>;
  };

  return (
    <section className="flex flex-col gap-2.5">
      {notice && (
        <p className="rounded-[12px] border border-complete/30 bg-complete/10 px-3.5 py-2.5 text-[12.5px] leading-snug text-complete">
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] leading-snug text-sand">
          Recurring checks of any public page. Alerts land on the Task Board.
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          aria-label="New watch"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet text-canvas"
        >
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-[13px] text-clay">Loading…</p>
      ) : watches.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-white/12 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gold/12 text-gold">
            <Eye size={22} />
          </span>
          <p className="font-display text-[16px] font-bold text-cream">No watches yet</p>
          <p className="max-w-[260px] text-[13px] leading-snug text-sand">
            Track a price, a restock, or any page change. She checks on schedule and
            pings you on the board when something happens.
          </p>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <span className="flex items-center gap-2">
              <Plus size={15} /> Create your first
            </span>
          </Button>
        </section>
      ) : (
        <div className="flex flex-col gap-2.5">
          {watches.map((w) => {
            const KindIcon = KIND_META[w.kind]?.icon ?? Eye;
            return (
              <article
                key={w.id}
                className="flex flex-col gap-2.5 rounded-[16px] border border-white/8 bg-elevated p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-bold text-cream">
                      {w.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-clay">
                      <KindIcon size={11} />
                      {KIND_META[w.kind]?.label ?? w.kind} · {w.schedule}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(w)}
                    disabled={busyId === w.id}
                    aria-label={w.enabled ? "Pause watch" : "Enable watch"}
                    className={`flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                      w.enabled ? "border-gold/60 bg-gold/30" : "border-white/15 bg-white/8"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full transition-all ${
                        w.enabled ? "ml-[26px] bg-gold" : "ml-[3px] bg-sand"
                      }`}
                    />
                  </button>
                </div>

                <p className="truncate rounded-[10px] bg-white/5 px-3 py-2 text-[12px] text-sand">
                  {w.url}
                </p>

                {w.kind === "text" && w.needle && (
                  <p className="text-[12px] text-clay">Looking for: “{w.needle}”</p>
                )}
                {w.kind === "price" && w.threshold !== null && (
                  <p className="text-[12px] text-clay">
                    Alert at ≤ ${w.threshold}
                    {w.lastValue ? ` · last seen $${w.lastValue}` : ""}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {statusChip(w)}
                    <span className="text-[11px] text-clay">
                      {w.lastCheckAt ? `checked ${timeAgo(w.lastCheckAt)}` : "never checked"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => runNow(w)}
                      disabled={busyId === w.id}
                      className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/12 px-3 py-1.5 text-[12px] font-semibold text-gold transition active:scale-95 disabled:opacity-50"
                    >
                      {busyId === w.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Play size={12} />
                      )}
                      Check now
                    </button>
                    <button
                      onClick={() => remove(w)}
                      disabled={busyId === w.id}
                      aria-label="Delete watch"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-clay transition hover:text-alert disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>

                {w.lastStatus === "error" && w.lastError && (
                  <p className="flex items-start gap-1.5 text-[12px] leading-snug text-alert">
                    <XCircle size={13} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{w.lastError}</span>
                  </p>
                )}
                {w.lastStatus === "ok" && (
                  <p className="flex items-start gap-1.5 text-[12px] leading-snug text-clay">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-complete" />
                    Last check was clean.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="pb-2 text-center text-[11.5px] text-clay">
        Hourly checks run while your server is up · on Vercel, checks run on the daily cron
      </p>

      {/* Create sheet */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="New watch">
        <div className="flex flex-col gap-4 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-sand">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monitor listing price"
              maxLength={80}
              className="h-13 w-full rounded-[14px] border border-white/12 bg-canvas px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-sand">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/listing"
              inputMode="url"
              className="h-13 w-full rounded-[14px] border border-white/12 bg-canvas px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
            />
          </label>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-sand">Watch for</p>
            <div className="grid grid-cols-3 gap-2">
              {(["change", "text", "price"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`rounded-[14px] border p-3.5 text-left transition ${
                    kind === k ? "border-gold/60 bg-gold/12" : "border-white/10 bg-elevated"
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 text-[13px] font-semibold ${
                      kind === k ? "text-gold" : "text-cream"
                    }`}
                  >
                    {k === "change" ? (
                      <Eye size={14} />
                    ) : k === "text" ? (
                      <TypeIcon size={14} />
                    ) : (
                      <DollarSign size={14} />
                    )}
                    {KIND_META[k].label}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-clay">
                    {k === "change"
                      ? "Any content change alerts"
                      : k === "text"
                        ? "When specific text shows up"
                        : "When the price hits your number"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {kind === "text" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-sand">Text to find</span>
              <input
                value={needle}
                onChange={(e) => setNeedle(e.target.value)}
                placeholder="Back in stock"
                maxLength={200}
                className="h-13 w-full rounded-[14px] border border-white/12 bg-canvas px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
          )}

          {kind === "price" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-sand">Alert at or below (USD)</span>
              <input
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="250"
                inputMode="decimal"
                className="h-13 w-full rounded-[14px] border border-white/12 bg-canvas px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50"
              />
            </label>
          )}

          <div>
            <p className="mb-2 text-[13px] font-semibold text-sand">Schedule</p>
            <div className="grid grid-cols-2 gap-2">
              {(["hourly", "daily"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSchedule(s)}
                  className={`rounded-[14px] border py-3 text-center text-[14px] font-semibold capitalize transition ${
                    schedule === s
                      ? "border-gold/60 bg-gold/12 text-gold"
                      : "border-white/10 bg-elevated text-cream"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {saveError && <p className="text-[12.5px] text-alert">{saveError}</p>}

          <Button
            variant="gradient"
            size="lg"
            onClick={create}
            disabled={
              saving ||
              !name.trim() ||
              !url.trim() ||
              (kind === "text" && !needle.trim()) ||
              (kind === "price" && !threshold.trim())
            }
          >
            <span className="flex items-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? "Saving…" : "Create watch"}
            </span>
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
