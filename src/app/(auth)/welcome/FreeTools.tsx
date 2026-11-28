"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Free tools, collapsed into one bar by default so the welcome hero stays
 * clean and focused. Tapping the bar drops down the existing free tools —
 * Prompt Forge, Muse Dashboard — plus the existing signed-in Today's Pulse
 * (/office/pulse), which logged-out visitors reach via sign-in.
 */
export function FreeTools() {
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="Free tools" className="flex w-full flex-col px-8 pb-10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="free-tools-panel"
        onClick={() => setOpen((v) => !v)}
        className="glass flex min-h-12 w-full items-center justify-between gap-3 rounded-[16px] border border-white/12 px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <span>
          <span className="block text-[15px] font-semibold text-cream">
            Free tools
          </span>
          <span className="block text-[12.5px] text-sand">
            No account needed
          </span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 shrink-0 text-gold transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id="free-tools-panel"
          className="mt-2.5 flex flex-col gap-2.5"
        >
          <Link
            href="/forge"
            className="glass-card block rounded-[16px] border border-white/12 bg-elevated p-4 transition active:scale-[0.99]"
          >
            <span className="block text-[15px] font-semibold text-cream">
              Prompt Forge
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-sand">
              Score a rough ask on the 4-part brief, then forge it into a clean
              prompt, a task, or a BMAD build.
            </span>
            <span className="mt-1.5 block text-[12.5px] font-semibold text-gold">
              Try it free →
            </span>
          </Link>
          <Link
            href="/muse-dashboard"
            className="glass-card block rounded-[16px] border border-white/12 bg-elevated p-4 transition active:scale-[0.99]"
          >
            <span className="block text-[15px] font-semibold text-cream">
              Muse Dashboard
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-sand">
              Copy one prompt into your own Muse and it builds your personal
              dashboard — pillars, today at a glance, scored routine, leads, desks.
            </span>
            <span className="mt-1.5 block text-[12.5px] font-semibold text-gold">
              Try it free →
            </span>
          </Link>
          <Link
            href="/signin"
            className="glass-card block rounded-[16px] border border-white/12 bg-elevated p-4 transition active:scale-[0.99]"
          >
            <span className="block text-[15px] font-semibold text-cream">
              Today&apos;s Pulse
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-sand">
              Your activity, runs, and messages at a glance — the live pulse
              of your office.
            </span>
            <span className="mt-1.5 block text-[12.5px] font-semibold text-gold">
              Sign in to view →
            </span>
          </Link>

          <p className="mx-auto mt-1 max-w-[260px] text-center text-[11.5px] leading-relaxed text-clay">
            Uncensored by design. Your data stays yours — never sold, never used
            to train third parties.
          </p>
        </div>
      )}
    </section>
  );
}
