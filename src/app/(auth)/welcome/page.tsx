import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { OrethaMark } from "@/components/ui/OrethaMark";
import { FreeTools } from "./FreeTools";

export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/hub");
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero. The spacer is exactly half the viewport minus the logo's
          half-height and the top padding, so the logo's center sits on the
          screen's vertical center; the headline and buttons flow below it. */}
      <section className="flex min-h-dvh flex-col items-center px-8 pb-10 pt-10 text-center">
        <div aria-hidden className="h-[calc(50dvh-145px)] shrink-0" />
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-3 rounded-[50%] opacity-40 blur-xl"
            style={{
              background:
                "radial-gradient(ellipse, rgba(212,162,78,0.5), rgba(124,58,237,0.3) 70%, transparent)",
            }}
          />
          <OrethaMark
            width={168}
            height={210}
            priority
            className="rounded-[50%] border-2 border-gold/80 object-cover shadow-[0_0_0_5px_rgba(212,162,78,0.14)]"
          />
        </div>

        <div className="mt-8">
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

        <div className="mt-8 flex w-full flex-col gap-3">
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
      </section>

      {/* Free tools — collapsed into one bar; tap to drop down. */}
      <FreeTools />
    </main>
  );
}
