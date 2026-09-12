import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { GUIDES } from "@/lib/mock/content";

const CATEGORY_TINT: Record<string, string> = {
  "Real Estate": "text-dept-realestate",
  Work: "text-violet",
  Media: "text-gold",
};

export default function GuidesPage() {
  return (
    <main className="pad-safe-top flex flex-col gap-5 px-4 pt-2">
      <header>
        <h1 className="font-display text-[26px] font-bold text-cream">
          Guides & Playbooks
        </h1>
        <p className="mt-0.5 text-[13px] text-sand">
          Runbooks you can execute, not just read.
        </p>
      </header>

      <section className="flex flex-col gap-2.5">
        {GUIDES.map((g) => (
          <Link
            key={g.id}
            href={`/guides/${g.slug}`}
            className="flex items-center gap-3.5 rounded-[18px] border border-white/8 bg-elevated p-4 transition active:scale-[0.98]"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[15.5px] font-bold text-cream">
                {g.title}
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-sand">
                {g.summary}
              </span>
              <span className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-clay">
                  <Clock size={11} /> {g.readTime}
                </span>
                <span
                  className={`text-[11px] font-semibold ${CATEGORY_TINT[g.category] ?? "text-sand"}`}
                >
                  {g.category}
                </span>
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-clay" />
          </Link>
        ))}
      </section>
    </main>
  );
}
