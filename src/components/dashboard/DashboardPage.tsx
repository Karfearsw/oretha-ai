"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrethaIcon } from "@/components/brand/OrethaIcon";
import {
  DASHBOARD_PROMPT,
  DASHBOARD_PROMPT_SECTIONS,
} from "@/lib/dashboardPrompt";

/**
 * Muse Dashboard starter page body — shared by the public
 * /muse-dashboard route (logged-out visitors) and the signed-in in-app
 * experience. The shell around it (AppShell vs the public shell) is decided
 * by src/app/muse-dashboard/layout.tsx.
 *
 * `signedIn` means the visitor can send to chat: a session exists and setup
 * is complete. When false, "Send to chat" never fires — the gate below
 * points at /welcome instead, so it can never fail silently on a 401.
 *
 * Everything on this page is a template with placeholder figures, clearly
 * labeled "Example". No real person's data appears here, and nothing is
 * stored for a visitor without an account.
 */

const PILLARS = [
  { name: "Wealth", line: "Money in beats money out, every week" },
  { name: "Health", line: "Train, sleep, and eat like it matters" },
  { name: "Relationships", line: "Show up for my people, a few times a week" },
  { name: "Intellect", line: "Learn one real thing every day" },
  { name: "Spiritual", line: "Start the day grounded, end it grateful" },
  { name: "Emotions", line: "Name it, then choose the next step" },
];

const PREVIEW_BLOCKS = [
  { name: "Morning routine", coins: 15, hit: true },
  { name: "Deep work", coins: 40, hit: true },
  { name: "Train", coins: 25, hit: false },
  { name: "Post content", coins: 20, hit: true },
  { name: "Call one lead", coins: 30, hit: false },
  { name: "Journal", coins: 15, hit: false },
];

const PREVIEW_DESKS = [
  { name: "Content Studio", item: "Example: next post draft, due Friday" },
  { name: "Money Desk", item: "Example: invoice follow-up, $0 due" },
  { name: "Deals Desk", item: "Example: one buyer call booked" },
  { name: "Build Lab", item: "Example: landing page draft v1" },
  { name: "Life and Growth", item: "Example: book chapter 3" },
  { name: "Research Shelf", item: "Example: pricing notes to read" },
];

export function DashboardPage({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(DASHBOARD_PROMPT);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = DASHBOARD_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const downloadMd = () => {
    const blob = new Blob([DASHBOARD_PROMPT], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "muse-dashboard-starter-prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToChat = async () => {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/threads", { method: "POST" });
      const data = await res.json();
      if (data?.thread?.id) {
        router.push(
          `/chats/${data.thread.id}?prompt=${encodeURIComponent(DASHBOARD_PROMPT)}`
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex flex-col gap-5 px-4 pt-2">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
          Free — no account needed
        </p>
        <h1 className="mt-1 font-display text-[26px] font-bold text-cream">
          Muse Dashboard
        </h1>
        <p className="mt-0.5 text-[13px] leading-snug text-sand">
          One page that shows your whole life at a glance — six pillars, today
          at a glance, a scored daily routine, your leads, and six desks. Copy
          the starter prompt into your own Muse and it builds yours, from your
          real numbers.
        </p>
      </header>

      {/* The starter prompt */}
      <section aria-label="Starter prompt" className="flex flex-col gap-2.5">
        <h2 className="font-display text-[16px] font-bold text-cream">
          The starter prompt
        </h2>
        <p className="text-[12.5px] leading-snug text-sand">
          Paste this into your Muse. It asks you seven setup questions, then
          builds your dashboard from your answers. Covers{" "}
          {DASHBOARD_PROMPT_SECTIONS.join(" · ")}. Every figure in it is a
          placeholder you fill in — your Muse must never invent a number.
        </p>
        <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[18px] border border-white/10 bg-elevated p-4 text-[12.5px] leading-relaxed text-cream">
          {DASHBOARD_PROMPT}
        </pre>
        <div className="flex gap-2">
          <Button variant="gradient" size="md" onClick={copyPrompt} className="flex-1">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy the prompt"}
          </Button>
          <Button variant="ghost" size="md" onClick={downloadMd} aria-label="Download as Markdown">
            <Download size={16} /> .md
          </Button>
        </div>
        {signedIn ? (
          <Button variant="ghost" size="lg" onClick={sendToChat} loading={sending} className="w-full border-gold/30">
            <Send size={16} /> Use it in a chat here
          </Button>
        ) : (
          <Link
            href="/welcome"
            className="inline-flex h-12 w-full select-none items-center justify-center gap-2 rounded-[16px] bg-gold px-6 font-display text-[16px] font-semibold text-canvas transition active:scale-[0.97]"
          >
            <Send size={16} /> Sign in to build it in a chat here
          </Link>
        )}
      </section>

      {/* Preview layout */}
      <section aria-label="Preview">
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-cream">
          What it looks like
        </h2>
        <p className="mb-2.5 text-[12.5px] leading-snug text-sand">
          A preview of the layout, with example figures only. Your dashboard
          shows your real numbers — or leaves a cell blank until you have them.
        </p>
        <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-elevated p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
              Today at a Glance · Example
            </p>
            <p className="mt-1 text-[13.5px] font-semibold text-cream">
              Must-win today: Example — finish the one thing that matters most
            </p>
            <p className="text-[12.5px] text-sand">
              Money: Example — $0 landed · Health: Example — 7h sleep · People:
              Example — 2 replies owed
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PILLARS.map((p) => (
              <div
                key={p.name}
                className="rounded-[14px] border border-white/10 bg-canvas p-3"
              >
                <p className="text-[13px] font-semibold text-cream">{p.name}</p>
                <p className="text-[11.5px] leading-snug text-sand">{p.line}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
              Daily routine · Example — 1,250 coins
            </p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {PREVIEW_BLOCKS.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between rounded-[12px] border border-white/10 bg-canvas px-3 py-2"
                >
                  <span className="text-[12.5px] text-cream">
                    {b.hit ? "✓" : "○"} {b.name}
                  </span>
                  <span className="text-[12px] font-semibold text-gold">
                    {b.coins} coins
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-sand">
              Daily Quest: Example — move money + train + post (all three = bonus)
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
              Leads board · Example
            </p>
            <div className="mt-1.5 rounded-[12px] border border-white/10 bg-canvas px-3 py-2">
              <p className="text-[12.5px] font-semibold text-cream">
                Example lead — wants a quote, status: new
              </p>
              <p className="text-[11.5px] text-sand">
                Phone on file · Email on file — contact details stay private
              </p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
              Desks · Example
            </p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {PREVIEW_DESKS.map((d) => (
                <div key={d.name} className="flex items-baseline gap-2 text-[12.5px]">
                  <span className="font-semibold text-cream">{d.name}</span>
                  <span className="text-sand">{d.item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Account line — honest about storage */}
      <section aria-label="Save your dashboard">
        {signedIn ? (
          <div className="rounded-[16px] border border-gold/30 bg-gold/10 p-4">
            <p className="text-[13.5px] font-semibold text-cream">
              You&apos;re signed in.
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-sand">
              Paste the prompt into a chat and your Muse builds your dashboard
              and keeps it with your account.
            </p>
          </div>
        ) : (
          <Link
            href="/signup"
            className="block rounded-[16px] border border-gold/30 bg-gold/10 p-4 text-center transition active:scale-[0.99]"
          >
            <span className="block text-[13.5px] font-semibold text-cream">
              Create a free account to save your dashboard data →
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-sand">
              Without an account, nothing you do here is stored.
            </span>
          </Link>
        )}
      </section>

      <p className="pb-4 text-center text-[11.5px] leading-snug text-clay">
        Like Prompt Forge, free to use with no account. Your numbers stay yours
        — nothing here is stored unless you sign in.
      </p>
    </main>
  );
}
