import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function HeroBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-[24px] border border-white/10 p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(212,162,78,0.16), rgba(124,58,237,0.16) 55%, rgba(19,19,22,0.9))",
      }}
    >
      <div
        aria-hidden
        className="anim-grad-pan absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold via-violet to-gold"
      />
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
        Oretha AI
      </p>
      <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.15] text-cream">
        Uncensored Black-powered AI for your work, art, and hustle.
      </h1>
      <p className="mt-2 text-[13.5px] leading-snug text-sand">
        Agents on deck. Office in your pocket.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Link href="/chats">
          <Button variant="primary" size="md">
            Open Oretha <ArrowRight size={16} />
          </Button>
        </Link>
        <Link
          href="/chats/agents"
          className="text-[14px] font-semibold text-sand underline-offset-4 hover:text-cream hover:underline"
        >
          Browse agents
        </Link>
      </div>
    </section>
  );
}
