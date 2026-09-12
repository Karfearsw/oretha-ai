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

      <p className="max-w-[260px] text-[11.5px] leading-relaxed text-clay">
        Uncensored by design. Your data stays yours — never sold, never used to
        train third parties.
      </p>
    </main>
  );
}
