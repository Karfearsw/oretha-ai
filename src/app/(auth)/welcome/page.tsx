import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { OrethaMark } from "@/components/ui/OrethaMark";

export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/hub");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-3 rounded-full opacity-40 blur-xl"
          style={{
            background:
              "radial-gradient(circle, rgba(212,162,78,0.5), rgba(124,58,237,0.3) 70%, transparent)",
          }}
        />
        <OrethaMark size={140} priority />
      </div>

      <div>
        <h1 className="font-display text-[32px] font-bold leading-tight text-cream">
          Your work. Your art.{" "}
          <span className="bg-gradient-to-r from-gold to-violet bg-clip-text text-transparent">
            Your AI.
          </span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-sand">
          Uncensored, Black-powered AI with agents, a virtual office, and a
          media lab — all in your pocket.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/signup"
          className="flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-gold to-violet font-display text-[16px] font-semibold text-canvas transition active:scale-[0.98]"
        >
          Create account
        </Link>
        <Link
          href="/signin"
          className="flex h-13 w-full items-center justify-center rounded-[16px] border border-white/12 font-display text-[16px] font-semibold text-cream transition active:scale-[0.98]"
        >
          I already have an account
        </Link>
      </div>

      <div className="w-full text-left">
        <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
          Free tools — no account needed
        </p>
        <div className="flex flex-col gap-2.5">
          <Link
            href="/forge"
            className="block rounded-[16px] border border-white/12 bg-elevated p-4 transition active:scale-[0.99]"
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
            className="block rounded-[16px] border border-white/12 bg-elevated p-4 transition active:scale-[0.99]"
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
        </div>
      </div>

      <p className="max-w-[260px] text-[11.5px] leading-relaxed text-clay">
        Uncensored by design. Your data stays yours — never sold, never used to
        train third parties.
      </p>
    </main>
  );
}
