"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GUIDES } from "@/lib/mock/content";

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const guide = GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <main className="pad-safe-top flex flex-col items-center gap-3 px-4 pt-16">
        <p className="text-[15px] text-sand">Guide not found.</p>
        <Link href="/guides" className="text-[14px] font-semibold text-gold">
          Back to guides
        </Link>
      </main>
    );
  }

  return (
    <main className="pad-safe-top flex flex-col px-4 pt-2">
      <button
        onClick={() => router.back()}
        aria-label="Back"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-cream"
      >
        <ArrowLeft size={18} />
      </button>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
          Playbook · {guide.category}
        </p>
        <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-cream">
          {guide.title}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-clay">
          <Clock size={12} /> {guide.readTime} read · {guide.steps.length} steps
        </p>
      </header>

      <section className="mt-5 flex flex-col gap-3">
        {guide.steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-[18px] border border-white/8 bg-elevated p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet font-display text-[13px] font-bold text-canvas">
                {i + 1}
              </span>
              <h2 className="font-display text-[15.5px] font-bold text-cream">
                {step.title}
              </h2>
            </div>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-sand">
              {step.body}
            </p>
            <Link href="/chats/t1" className="mt-3 inline-block">
              <Button variant="ghost" size="sm">
                <Play size={13} /> Run this flow
              </Button>
            </Link>
          </div>
        ))}
      </section>

      <div className="mt-5 mb-2">
        <Link href="/chats/t1">
          <Button variant="gradient" size="lg" className="w-full">
            <Play size={17} /> Start the whole playbook
          </Button>
        </Link>
      </div>
    </main>
  );
}
